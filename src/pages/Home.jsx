import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-primary">
        Welcome to your new React boilerplate
      </h1>
      <p className="text-xl text-muted-foreground max-w-2xl">
        Production-ready frontend with Vite, React, Redux Toolkit, Tailwind CSS, shadcn/ui, React Router, Axios, and Sonner.
      </p>
      <div className="flex gap-4 mt-8">
        <Button asChild size="lg">
          <Link to="/login">Get Started</Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <a href="https://github.com/shadcn-ui/ui" target="_blank" rel="noreferrer">View shadcn/ui</a>
        </Button>
      </div>
    </div>
  );
}
