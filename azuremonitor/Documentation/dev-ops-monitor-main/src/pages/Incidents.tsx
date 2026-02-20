import { AppHeader } from '@/components/layout/AppHeader';
import { IncidentList } from '@/components/incidents/IncidentList';
import { AlertCircle } from 'lucide-react';

export default function Incidents() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Incidents</h1>
              <p className="text-muted-foreground mt-1">
                Track and manage incidents with linked alerts
              </p>
            </div>
          </div>
        </div>

        <IncidentList />
      </main>
    </div>
  );
}
