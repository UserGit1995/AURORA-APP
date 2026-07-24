import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart-context";

export function CartLink() {
  const { itemCount } = useCart();

  return (
    <Button asChild variant="outline" size="sm" className="relative">
      <Link to="/cart">
        <ShoppingCart className="h-4 w-4" />
        <span className="hidden sm:inline">Carrello</span>
        {itemCount > 0 && (
          <Badge className="absolute -right-2 -top-2 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
            {itemCount}
          </Badge>
        )}
      </Link>
    </Button>
  );
}
