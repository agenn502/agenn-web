import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const auth = request.headers.get("authorization");

  const user = "agenn";
  const pass = "ivfundadores";

  if (auth) {
    const encoded = auth.split(" ")[1];
    const decoded = atob(encoded);
    const [username, password] = decoded.split(":");

    if (username === user && password === pass) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Acceso restringido", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="AGENN"',
    },
  });
}

export const config = {
  matcher: "/:path*",
};