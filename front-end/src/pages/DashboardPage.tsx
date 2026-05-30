import DropZone from '../components/analysis/DropZone';

export default function DashboardPage() {
  const handleSubmit = (datFile: File, heaFile: File) => {
    console.log('DAT:', datFile.name, 'HEA:', heaFile.name);
  };

  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <DropZone onSubmit={handleSubmit} />
    </div>
  );
}