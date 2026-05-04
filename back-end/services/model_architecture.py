import torch
import torch.nn as nn


# =========================================================
# Residual Block
# =========================================================

class ResBlock1D(nn.Module):
    """
    Two-layer Residual Block for 1D signals.

    Main path:
        Conv -> BN -> LeakyReLU -> Dropout -> Conv -> BN

    Skip path:
        Identity OR 1x1 Conv -> BN (if shape changes)

    Output:
        LeakyReLU(main + skip)
    """

    def __init__(
        self,
        in_ch: int,
        out_ch: int,
        kernel: int = 7,
        stride: int = 1,
        dropout: float = 0.1,
    ):
        super().__init__()

        pad = kernel // 2

        self.main = nn.Sequential(
            nn.Conv1d(
                in_ch,
                out_ch,
                kernel_size=kernel,
                stride=stride,
                padding=pad,
                bias=False,
            ),
            nn.BatchNorm1d(out_ch),

            nn.LeakyReLU(
                negative_slope=0.01,
                inplace=True
            ),

            nn.Dropout(p=dropout),

            nn.Conv1d(
                out_ch,
                out_ch,
                kernel_size=kernel,
                stride=1,
                padding=pad,
                bias=False,
            ),

            nn.BatchNorm1d(out_ch),
        )

        # Projection shortcut if dimensions change
        if stride != 1 or in_ch != out_ch:
            self.skip = nn.Sequential(
                nn.Conv1d(
                    in_ch,
                    out_ch,
                    kernel_size=1,
                    stride=stride,
                    bias=False,
                ),
                nn.BatchNorm1d(out_ch),
            )
        else:
            self.skip = nn.Identity()

        self.act = nn.LeakyReLU(
            negative_slope=0.01,
            inplace=True
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = self.skip(x)
        out      = self.main(x)
        return self.act(out + residual)


# =========================================================
# Attention Pooling
# =========================================================

class AttentionPooling(nn.Module):
    """
    Learns temporal attention weights and performs
    weighted temporal pooling.

    Input:
        (B, C, L)

    Output:
        (B, C)
    """

    def __init__(self, in_ch: int):
        super().__init__()

        self.score = nn.Sequential(
            nn.Conv1d(in_ch, in_ch // 2, kernel_size=1),
            nn.Tanh(),
            nn.Conv1d(in_ch // 2, 1, kernel_size=1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Attention weights
        w = torch.softmax(self.score(x), dim=-1)

        # Weighted temporal pooling
        return (x * w).sum(dim=-1)


# =========================================================
# Full ECG CNN
# =========================================================

class ECG1DCNN(nn.Module):
    """
    Architecture:

    Stem:
        Conv(K=15) -> BN -> LeakyReLU -> MaxPool/2

    Stage 0:
        2 × ResBlock(64 -> 64, stride=1)

    Stage 1:
        2 × ResBlock(64 -> 128, first block stride=2)

    Stage 2:
        2 × ResBlock(128 -> 256, first block stride=2)

    Head:
        AttentionPooling -> Dropout -> Linear
    """

    def __init__(
        self,
        n_leads: int = 12,
        n_classes: int = 5,
        base_ch: int = 64,
        blocks_per_stage: tuple = (2, 2, 2),
        kernel: int = 7,
        dropout: float = 0.3,
    ):
        super().__init__()

        # =================================================
        # Stem
        # =================================================

        self.stem = nn.Sequential(
            nn.Conv1d(
                n_leads,
                base_ch,
                kernel_size=15,
                stride=1,
                padding=7,
                bias=False,
            ),
            nn.BatchNorm1d(base_ch),
            nn.LeakyReLU(
                negative_slope=0.01,
                inplace=True
            ),
            nn.MaxPool1d(
                kernel_size=2,
                stride=2,
            ),
        )

        # =================================================
        # Residual stages
        # =================================================

        channel_schedule = [
            base_ch * (2 ** i)
            for i in range(len(blocks_per_stage))
        ]

        stages: list[nn.Module] = []

        in_ch = base_ch

        for stage_idx, n_blocks in enumerate(blocks_per_stage):

            out_ch = channel_schedule[stage_idx]

            for block_idx in range(n_blocks):

                stride = (
                    2
                    if (block_idx == 0 and stage_idx > 0)
                    else 1
                )

                stages.append(
                    ResBlock1D(
                        in_ch=in_ch,
                        out_ch=out_ch,
                        kernel=kernel,
                        stride=stride,
                        dropout=dropout,
                    )
                )

                in_ch = out_ch

        self.stages = nn.Sequential(*stages)

        # =================================================
        # Classification head
        # =================================================

        self.gap     = AttentionPooling(in_ch)
        self.dropout = nn.Dropout(p=dropout)
        self.fc      = nn.Linear(in_ch, n_classes)

        self._init_weights()

    # =====================================================
    # Weight initialization
    # =====================================================

    def _init_weights(self) -> None:
        for m in self.modules():
            if isinstance(m, nn.Conv1d):
                nn.init.kaiming_normal_(
                    m.weight,
                    mode="fan_out",
                    nonlinearity="leaky_relu",
                )
            elif isinstance(m, nn.BatchNorm1d):
                nn.init.ones_(m.weight)
                nn.init.zeros_(m.bias)
            elif isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                nn.init.zeros_(m.bias)

    # =====================================================
    # Forward pass
    # =====================================================

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: Tensor of shape (B, 12, 1000)

        Returns:
            logits: Tensor of shape (B, n_classes)
        """
        x      = self.stem(x)      # (B, 64,  500)
        x      = self.stages(x)    # (B, 256, 125)
        x      = self.gap(x)       # (B, 256)
        x      = self.dropout(x)
        logits = self.fc(x)        # (B, 5)
        return logits