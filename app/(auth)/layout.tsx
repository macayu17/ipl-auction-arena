export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-8 lg:px-6">
      <div className="w-full max-w-6xl">{children}</div>
    </div>
  );
}
