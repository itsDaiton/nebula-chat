import { useNavigate } from '@tanstack/react-router';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="flex max-w-lg flex-col items-center gap-6 text-center">
        <div>
          <p className="font-mono text-7xl font-semibold tracking-tight text-muted-foreground md:text-8xl">
            {resources.notFound.status}
          </p>
          <h1 className="mt-4 text-xl font-medium text-foreground md:text-2xl">
            {resources.notFound.title}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground md:text-base">{resources.notFound.message}</p>
        <Button size="lg" className="px-8" onClick={() => void navigate({ to: '/' })}>
          {resources.notFound.action}
        </Button>
      </div>
    </div>
  );
};
