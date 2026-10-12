import { Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function AdminRoute() {
  const { isProductOwner } = useAuth();
  return isProductOwner ? <Outlet /> : <div role="alert">Table Management is available only to admin accounts.</div>;
}
