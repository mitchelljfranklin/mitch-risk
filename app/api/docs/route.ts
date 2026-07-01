import spec from "@/lib/openapi.json";

const SPEC = {
  ...spec,
  servers: [
    {
      url: process.env.APP_URL ?? "http://localhost:3000",
      description: "mitch-risk API server",
    },
  ],
};

export function GET() {
  return Response.json(SPEC);
}
