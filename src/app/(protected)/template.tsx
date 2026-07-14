export default function ProtectedRouteTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="route-content-enter">{children}</div>;
}
