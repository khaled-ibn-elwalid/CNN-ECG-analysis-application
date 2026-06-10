import React, { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export const LoginPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: FormEvent) => {  // Use FormEvent directly
        e.preventDefault();
        
        setError(null);
        setIsLoading(true);

        try {
            const data = await loginUser({ username, password });

            login(data.access_token);
            navigate("/dashboard");
            
        } catch (err) {
  const message = err instanceof Error
    ? err.message
    : 'Invalid username or password. Please try again.';
  setError(message);
}
    };

   return (
  <div className="min-h-screen flex items-center justify-center bg-[#f5f5f6] px-4 font-inter">
    
    {/* CARD */}
    <div
      className="
        w-full
        max-w-[410px]
        border
        border-[#dcdde3]
        bg-[#f8f8fa]
        rounded-md
        px-9
        py-8
        shadow-[0_1px_2px_rgba(0,0,0,0.03)]
      "
    >
      
      {/* HEADER */}
      <div className="mb-7">
        <h1 className="text-[24px] font-semibold tracking-tight text-[#2d3142]">
          Welcome
        </h1>

        <p className="mt-1 text-[13px] text-[#7b8090]">
          Sign in to continue.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div
          className="
            mb-5
            rounded-sm
            border
            border-red-200
            bg-red-50
            px-3
            py-2
            text-[12px]
            text-red-600
          "
        >
          {error}
        </div>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* USERNAME */}
        <div>
          <label
            htmlFor="username"
            className="
              mb-2
              block
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.08em]
              text-[#2d3142]
            "
          >
            Username
          </label>

          <input
            id="username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your clinical ID"
            className="
              h-11
              w-full
              rounded-sm
              border
              border-[#d7d9df]
              bg-white
              px-4
              text-[14px]
              text-[#2d3142]
              outline-none
              transition-colors
              placeholder:text-[#a5a8b3]
              focus:border-[#2563eb]
            "
          />
        </div>

        {/* PASSWORD */}
        <div>
          <label
            htmlFor="password"
            className="
              mb-2
              block
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.08em]
              text-[#2d3142]
            "
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="
              h-11
              w-full
              rounded-sm
              border
              border-[#d7d9df]
              bg-white
              px-4
              text-[14px]
              text-[#2d3142]
              outline-none
              transition-colors
              placeholder:text-[#a5a8b3]
              focus:border-[#2563eb]
            "
          />
        </div>

        {/* BUTTON */}
        <button
          type="submit"
          disabled={isLoading}
          className="
            mt-1
            h-11
            w-full
            rounded-sm
            bg-[#2563eb]
            text-[14px]
            font-medium
            text-white
            transition-colors
            hover:bg-[#1d4ed8]
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {/* FOOTER */}
      <div className="mt-8 text-center">
        <a
          href="#"
          className="
            text-[13px]
            text-[#7b8090]
            transition-colors
            hover:text-[#2d3142]
          "
        >
          Request an Account
        </a>
      </div>
    </div>
  </div>
);
};