import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, Plus, FileText, Video, Link2, Download, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Resource {
  id: string;
  title: string;
  description: string;
  file_url: string | null;
  video_url: string | null;
  resource_type: string;
  uploaded_by: string;
  created_at: string;
  uploader_name?: string;
}

const ResourcesPage = () => {
  const { user, role } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState("document");
  const [videoUrl, setVideoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canUpload = role === "mentor" || role === "admin";

  const fetchResources = async () => {
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch uploader names
      const uploaderIds = [...new Set(data.map((r) => r.uploaded_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", uploaderIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach((p) => (nameMap[p.user_id] = p.full_name));

      setResources(
        data.map((r) => ({ ...r, uploader_name: nameMap[r.uploaded_by] || "Unknown" }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      let fileUrl: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("resources")
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("resources").getPublicUrl(path);
        fileUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("resources").insert({
        title,
        description,
        resource_type: resourceType,
        file_url: fileUrl,
        video_url: resourceType === "video" ? videoUrl : null,
        uploaded_by: user.id,
      });

      if (error) throw error;
      toast.success("Resource uploaded!");
      setDialogOpen(false);
      setTitle("");
      setDescription("");
      setVideoUrl("");
      setFile(null);
      fetchResources();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Resource deleted");
      setResources((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="h-4 w-4" />;
      case "link": return <Link2 className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "video": return "bg-accent/10 text-accent";
      case "link": return "bg-secondary/10 text-secondary";
      default: return "bg-primary/10 text-primary";
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-['Space_Grotesk']">Learning Resources</h1>
          <p className="text-muted-foreground mt-1">Browse and download learning materials.</p>
        </div>
        {canUpload && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Upload Resource</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-['Space_Grotesk']">Upload Resource</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={resourceType} onValueChange={setResourceType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="document">Document / PDF</SelectItem>
                      <SelectItem value="video">Video Link</SelectItem>
                      <SelectItem value="link">External Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {resourceType === "video" || resourceType === "link" ? (
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>File</Label>
                    <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Uploading..." : "Upload"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : resources.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold font-['Space_Grotesk'] mb-2">No Resources Yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {canUpload ? "Upload the first learning resource for your students." : "Resources will appear here once uploaded by your mentors."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((r) => (
            <Card key={r.id} className="border-border/50 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${typeColor(r.resource_type)}`}>
                      {typeIcon(r.resource_type)}
                    </div>
                    <Badge variant="outline" className="capitalize text-xs">{r.resource_type}</Badge>
                  </div>
                  {(role === "admin" || r.uploaded_by === user?.id) && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <CardTitle className="text-base font-['Space_Grotesk'] mt-2">{r.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {r.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{r.description}</p>}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>by {r.uploader_name}</span>
                  <span>{format(new Date(r.created_at), "MMM d, yyyy")}</span>
                </div>
                {(r.file_url || r.video_url) && (
                  <a
                    href={r.file_url || r.video_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Download className="h-3 w-3" />
                    {r.resource_type === "video" ? "Watch Video" : r.resource_type === "link" ? "Open Link" : "Download"}
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default ResourcesPage;
