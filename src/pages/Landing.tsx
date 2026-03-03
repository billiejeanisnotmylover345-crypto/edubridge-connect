import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { GraduationCap, Users, BarChart3, BookOpen, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Users,
    title: "Smart Mentor Matching",
    description: "Auto-assigned mentors based on availability. Never wait without guidance.",
    color: "hsl(262, 83%, 58%)",
  },
  {
    icon: BookOpen,
    title: "Learning Resources",
    description: "Access curated materials, documents, and video content from your mentors.",
    color: "hsl(199, 89%, 48%)",
  },
  {
    icon: GraduationCap,
    title: "Mentorship Sessions",
    description: "Schedule and attend sessions with your assigned mentor seamlessly.",
    color: "hsl(340, 82%, 52%)",
  },
  {
    icon: BarChart3,
    title: "Track Progress",
    description: "Monitor your learning journey with analytics and milestone tracking.",
    color: "hsl(152, 69%, 40%)",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold font-['Space_Grotesk']">EduBridge</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-20 pb-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Connecting learners with mentors
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 font-['Space_Grotesk']">
            Your Bridge to
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              {" "}Better Learning
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            EduBridge connects students with experienced mentors, providing structured
            learning paths, resources, and real-time guidance to accelerate your growth.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" asChild className="text-base px-8">
              <Link to="/register">
                Start Learning <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base px-8">
              <Link to="/login">I have an account</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 pb-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold font-['Space_Grotesk'] mb-3">
            Everything you need to succeed
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            A complete platform designed for effective mentorship and learning management.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <Card className="h-full border-border/50 hover:shadow-lg transition-shadow duration-300">
                <CardContent className="pt-6">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${feature.color}15` }}
                  >
                    <feature.icon className="h-6 w-6" style={{ color: feature.color }} />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 font-['Space_Grotesk']">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 EduBridge. Built for learning, powered by mentorship.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
