import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { AccountingAccessProvider, useAccountingAccess, writePermission } from "../accounting/AccountingAccess";

function PermissionRoute() {
  const { can } = useAccountingAccess();
  const { pathname } = useLocation();
  const code = writePermission(pathname);
  if (code && /\/(add|edit|payment|payments|bulk-update)(\/|$)/.test(pathname) && !can(code))
    return <div role="alert">Your account needs {code} to perform this action. Ask your tenant owner to grant access.</div>;
  return <Outlet />;
}

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  return isAuthenticated ? (
    <AccountingAccessProvider><PermissionRoute /></AccountingAccessProvider>
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
}
