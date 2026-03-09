import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("learner");
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signUp(email, password, fullName, role);
      toast.success("Account created! Redirecting to dashboard...");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden page-bg">
      {/* Background blobs */}
      <div className="absolute top-10 right-10 w-64 h-64 bg-accent/15 rounded-full filter blur-3xl animate-blob" />
      <div className="absolute bottom-10 left-10 w-64 h-64 bg-primary/15 rounded-full filter blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-success/10 rounded-full filter blur-3xl animate-blob animation-delay-4000" />

      <Card className="w-full max-w-md relative z-10 glass-card shadow-xl shadow-primary/10">
        <CardHeader className="text-center">
          <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4">
            <div className="h-12 w-12 rounded-2xl gradient-fun flex items-center justify-center shadow-lg shadow-primary/25">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
          </Link>
          <CardTitle className="text-2xl font-['Space_Grotesk']">Join EduBridge!</CardTitle>
          <CardDescription>Create your account and start your adventure</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Your awesome name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>I am a</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="learner">Learner (Student)</SelectItem>
                  <SelectItem value="mentor">Mentor (Teacher)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full rounded-xl gradient-fun border-0 shadow-md shadow-primary/20 hover:shadow-primary/40 transition-shadow" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
