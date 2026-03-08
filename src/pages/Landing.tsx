import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { GraduationCap, Users, BarChart3, BookOpen, ArrowRight, Sparkles, Rocket, Star, Zap } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Users,
    title: "Smart Mentor Matching",
    description: "Get paired with the perfect mentor automatically. No waiting around!",
    gradient: "gradient-cool",
  },
  {
    icon: BookOpen,
    title: "Learning Resources",
    description: "Videos, docs, and guides from your mentors — all in one place!",
    gradient: "gradient-warm",
  },
  {
    icon: GraduationCap,
    title: "Live Sessions",
    description: "Jump into scheduled sessions with your mentor. Easy peasy!",
    gradient: "gradient-fresh",
  },
  {
    icon: BarChart3,
    title: "Track Progress",
    description: "See how far you've come with milestones and progress bars!",
    gradient: "gradient-fun",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: "easeOut" as const },
  }),
};

const Landing = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl gradient-fun flex items-center justify-center shadow-lg shadow-primary/25">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold font-['Space_Grotesk'] gradient-text">EduBridge</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="rounded-full">
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild className="rounded-full gradient-fun border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
              <Link to="/register">Get Started ✨</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative container mx-auto px-4 pt-20 pb-28">
        {/* Animated blobs */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/20 rounded-full filter blur-3xl animate-blob" />
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-accent/20 rounded-full filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-10 left-1/3 w-72 h-72 bg-secondary/20 rounded-full filter blur-3xl animate-blob animation-delay-4000" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center relative z-10"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-8"
          >
            <Sparkles className="h-4 w-4 animate-sparkle" />
            The fun way to learn with mentors
            <Rocket className="h-4 w-4 animate-bounce-gentle" />
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 font-['Space_Grotesk'] leading-tight">
            Your Bridge to
            <br />
            <span className="gradient-text">
              Better Learning
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect with awesome mentors, crush your goals, and level up your skills.
            Learning has never been this <span className="font-semibold text-primary">fun</span>!
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button size="lg" asChild className="text-base px-8 rounded-full gradient-fun border-0 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all">
              <Link to="/register">
                Start Learning <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base px-8 rounded-full border-2 hover:scale-105 transition-all">
              <Link to="/login">I have an account</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 pb-28 relative z-10">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold font-['Space_Grotesk'] mb-3">
            Everything you need to <span className="gradient-text">succeed</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-lg">
            A platform that makes learning feel like an adventure.
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
              <Card className="h-full border-border/50 fun-card group relative overflow-hidden">
                <div className={`absolute inset-0 ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                <CardContent className="pt-6 relative z-10">
                  <div
                    className={`h-12 w-12 rounded-xl ${feature.gradient} flex items-center justify-center mb-4 shadow-md`}
                  >
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 font-['Space_Grotesk']">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 pb-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center gradient-fun rounded-3xl p-12 shadow-2xl shadow-primary/20 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-50" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold font-['Space_Grotesk'] text-white mb-4">
              Ready to start your journey?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">
              Join thousands of learners already crushing their goals on EduBridge.
            </p>
            <Button
              size="lg"
              asChild
              className="rounded-full bg-white text-primary hover:bg-white/90 font-bold text-base px-10 shadow-lg hover:scale-105 transition-all"
            >
              <Link to="/register">
                Join Now — It's Free! <Zap className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
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
