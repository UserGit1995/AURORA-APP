import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listRequests } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const fetchRequests = useServerFn(listRequests);
  const { data: requests = [] } = useQuery({
    queryKey: ["admin", "requests"],
    queryFn: () => fetchRequests({ data: undefined }),
  });

  const newCount = requests.filter((r: any) => r.status === "new").length;
  const processingCount = requests.filter((r: any) => r.status === "processing").length;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Link to="/admin/requests">
        <Card className="transition hover:border-primary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Richieste
              {newCount > 0 && <Badge>{newCount} nuove</Badge>}
            </CardTitle>
            <CardDescription>{requests.length} totali · {processingCount} in lavorazione</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-primary">Gestisci →</CardContent>
        </Card>
      </Link>
      <Link to="/admin/products">
        <Card className="transition hover:border-primary">
          <CardHeader>
            <CardTitle>Prodotti</CardTitle>
            <CardDescription>Aggiungi foto, prezzi e categoria.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-primary">Gestisci →</CardContent>
        </Card>
      </Link>
      <Link to="/admin/categories">
        <Card className="transition hover:border-primary">
          <CardHeader>
            <CardTitle>Categorie</CardTitle>
            <CardDescription>Organizza il catalogo per categorie.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-primary">Gestisci →</CardContent>
        </Card>
      </Link>
    </div>
  );
}