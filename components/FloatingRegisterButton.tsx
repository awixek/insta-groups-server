import Link from "next/link";

export default function FloatingRegisterButton() {
  return (
    <Link
      href="/register"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 btn-primary shadow-lg shadow-accent/30 whitespace-nowrap"
    >
      + Register your group in 3 minutes
    </Link>
  );
}
