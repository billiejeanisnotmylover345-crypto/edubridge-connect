import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

interface PlaceholderPageProps {
  title: string;
}

const PlaceholderPage = ({ title }: PlaceholderPageProps) => {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-['Space_Grotesk']">{title}</h1>
      </div>
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Construction className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold font-['Space_Grotesk'] mb-2">Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              This feature is part of Phase 2 and will be available in the next iteration.
            </p>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default PlaceholderPage;
