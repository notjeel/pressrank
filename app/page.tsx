import { redirect } from "next/navigation";

// The Arena is the product's front door (per the design — the logo links here).
export default function HomePage() {
  redirect("/arena");
}
