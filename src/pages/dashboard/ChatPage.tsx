import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, MessageCircle, Search, X, Eye } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Contact {
  id: string;
  name: string;
  unread: number;
}

interface Conversation {
  mentor_id: string;
  learner_id: string;
  mentor_name: string;
  learner_name: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  read: boolean;
  created_at: string;
}

const ChatPage = () => {
  const { user, role } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [contactSearch, setContactSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Admin-specific state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});

  const fetchAdminConversations = async () => {
    if (!user || role !== "admin") return;

    // Get all active assignments
    const { data: assignments } = await supabase
      .from("mentor_assignments")
      .select("mentor_id, learner_id")
      .eq("status", "active");

    if (!assignments || assignments.length === 0) {
      setLoading(false);
      return;
    }

    // Get all unique user IDs
    const userIds = [...new Set(assignments.flatMap((a) => [a.mentor_id, a.learner_id]))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const nameMap: Record<string, string> = {};
    profiles?.forEach((p) => { nameMap[p.user_id] = p.full_name; });
    setProfileMap(nameMap);

    const convos: Conversation[] = assignments.map((a) => ({
      mentor_id: a.mentor_id,
      learner_id: a.learner_id,
      mentor_name: nameMap[a.mentor_id] || "Unknown Mentor",
      learner_name: nameMap[a.learner_id] || "Unknown Learner",
    }));

    setConversations(convos);
    setLoading(false);
  };

  const fetchAdminMessages = async (conv: Conversation) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${conv.mentor_id},receiver_id.eq.${conv.learner_id}),and(sender_id.eq.${conv.learner_id},receiver_id.eq.${conv.mentor_id})`
      )
      .order("created_at", { ascending: true });

    setMessages((data as Message[]) || []);
  };

  const fetchContacts = async () => {
    if (!user) return;

    let contactIds: string[] = [];

    if (role === "learner") {
      const { data } = await supabase
        .from("mentor_assignments")
        .select("mentor_id")
        .eq("learner_id", user.id)
        .eq("status", "active");
      contactIds = data?.map((d) => d.mentor_id) || [];
    } else if (role === "mentor") {
      const { data } = await supabase
        .from("mentor_assignments")
        .select("learner_id")
        .eq("mentor_id", user.id)
        .eq("status", "active");
      contactIds = data?.map((d) => d.learner_id) || [];
    }

    if (contactIds.length === 0) {
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", contactIds);

    const { data: unreadMessages } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("receiver_id", user.id)
      .eq("read", false);

    const unreadMap: Record<string, number> = {};
    unreadMessages?.forEach((m: any) => {
      unreadMap[m.sender_id] = (unreadMap[m.sender_id] || 0) + 1;
    });

    setContacts(
      profiles?.map((p) => ({
        id: p.user_id,
        name: p.full_name,
        unread: unreadMap[p.user_id] || 0,
      })) || []
    );
    setLoading(false);
  };

  const fetchMessages = async (contactId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });

    setMessages((data as Message[]) || []);

    await supabase
      .from("messages")
      .update({ read: true })
      .eq("sender_id", contactId)
      .eq("receiver_id", user.id)
      .eq("read", false);

    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, unread: 0 } : c))
    );
  };

  useEffect(() => {
    if (role === "admin") {
      fetchAdminConversations();
    } else {
      fetchContacts();
    }
  }, [user, role]);

  useEffect(() => {
    if (role === "admin" && selectedConversation) {
      fetchAdminMessages(selectedConversation);
    } else if (selectedContact) {
      fetchMessages(selectedContact.id);
    }
  }, [selectedContact, selectedConversation]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("chat-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;

          if (role === "admin" && selectedConversation) {
            const { mentor_id, learner_id } = selectedConversation;
            if (
              (msg.sender_id === mentor_id && msg.receiver_id === learner_id) ||
              (msg.sender_id === learner_id && msg.receiver_id === mentor_id)
            ) {
              setMessages((prev) => [...prev, msg]);
            }
          } else if (
            (msg.sender_id === user.id || msg.receiver_id === user.id) &&
            selectedContact &&
            (msg.sender_id === selectedContact.id || msg.receiver_id === selectedContact.id)
          ) {
            setMessages((prev) => [...prev, msg]);
            if (msg.sender_id !== user.id) {
              supabase
                .from("messages")
                .update({ read: true })
                .eq("id", msg.id);
            }
          } else if (msg.receiver_id === user.id) {
            setContacts((prev) =>
              prev.map((c) =>
                c.id === msg.sender_id ? { ...c, unread: c.unread + 1 } : c
              )
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, selectedContact, selectedConversation, role]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!user || !selectedContact || !newMessage.trim() || role === "admin") return;
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: selectedContact.id,
      body: newMessage.trim(),
    });
    if (error) toast.error("Failed to send");
    setNewMessage("");
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getSenderName = (senderId: string) => {
    if (role === "admin") return profileMap[senderId] || "Unknown";
    return senderId === user?.id ? "You" : selectedContact?.name || "Unknown";
  };

  // Admin view
  if (role === "admin") {
    const filteredConvos = conversations.filter(
      (c) =>
        c.mentor_name.toLowerCase().includes(contactSearch.toLowerCase()) ||
        c.learner_name.toLowerCase().includes(contactSearch.toLowerCase())
    );

    return (
      <DashboardLayout>
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold font-['Space_Grotesk']">Chat Monitor</h1>
            <Badge variant="secondary" className="text-xs">
              <Eye className="h-3 w-3 mr-1" /> Read-Only
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">Monitor conversations between mentors and learners.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold font-['Space_Grotesk'] mb-2">No Conversations</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Conversations will appear here once mentors and learners are assigned.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
            {/* Conversation list */}
            <Card className="border-border/50 md:col-span-1 flex flex-col">
              <div className="p-2 pb-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Search conversations..."
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>
              <CardContent className="p-2 flex-1 overflow-auto">
                <div className="space-y-1">
                  {filteredConvos.map((c, i) => (
                    <button
                      key={`${c.mentor_id}-${c.learner_id}`}
                      onClick={() => setSelectedConversation(c)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                        selectedConversation?.mentor_id === c.mentor_id &&
                        selectedConversation?.learner_id === c.learner_id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex -space-x-2">
                        <Avatar className="h-8 w-8 border-2 border-background">
                          <AvatarFallback className="bg-secondary/20 text-secondary-foreground text-xs">
                            {getInitials(c.mentor_name)}
                          </AvatarFallback>
                        </Avatar>
                        <Avatar className="h-8 w-8 border-2 border-background">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(c.learner_name)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.mentor_name}</p>
                        <p className="text-xs text-muted-foreground truncate">↔ {c.learner_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Chat area (read-only) */}
            <Card className="border-border/50 md:col-span-2 flex flex-col">
              {selectedConversation ? (
                <>
                  <div className="p-4 border-b border-border flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <Avatar className="h-8 w-8 border-2 border-background">
                        <AvatarFallback className="bg-secondary/20 text-secondary-foreground text-xs">
                          {getInitials(selectedConversation.mentor_name)}
                        </AvatarFallback>
                      </Avatar>
                      <Avatar className="h-8 w-8 border-2 border-background">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(selectedConversation.learner_name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {selectedConversation.mentor_name} ↔ {selectedConversation.learner_name}
                      </p>
                    </div>
                    {showMessageSearch ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={messageSearch}
                          onChange={(e) => setMessageSearch(e.target.value)}
                          placeholder="Search messages..."
                          className="h-8 w-48 text-sm"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { setShowMessageSearch(false); setMessageSearch(""); }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowMessageSearch(true)}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-3">
                      {messages.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-8">No messages in this conversation yet.</p>
                      ) : (
                        messages
                          .filter((m) =>
                            !messageSearch || m.body.toLowerCase().includes(messageSearch.toLowerCase())
                          )
                          .map((m) => {
                            const isMentor = m.sender_id === selectedConversation.mentor_id;
                            const highlighted = messageSearch && m.body.toLowerCase().includes(messageSearch.toLowerCase());
                            return (
                              <div key={m.id} className={`flex ${isMentor ? "justify-end" : "justify-start"}`}>
                                <div
                                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                                    isMentor
                                      ? "bg-primary text-primary-foreground rounded-br-md"
                                      : "bg-muted rounded-bl-md"
                                  } ${highlighted ? "ring-2 ring-[hsl(var(--warning))]" : ""}`}
                                >
                                  <p className={`text-[10px] font-semibold mb-0.5 ${isMentor ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                    {getSenderName(m.sender_id)}
                                  </p>
                                  <p>{m.body}</p>
                                  <p className={`text-[10px] mt-1 ${isMentor ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                    {format(new Date(m.created_at), "h:mm a")}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                      )}
                      <div ref={scrollRef} />
                    </div>
                  </ScrollArea>
                  <div className="p-3 border-t border-border bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Eye className="h-3 w-3" /> Admin view — read-only monitoring
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Select a conversation to monitor
                </div>
              )}
            </Card>
          </div>
        )}
      </DashboardLayout>
    );
  }

  // Learner/Mentor view (unchanged)
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-['Space_Grotesk']">Messages</h1>
        <p className="text-muted-foreground mt-1">Chat with your {role === "learner" ? "mentors" : "students"}.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold font-['Space_Grotesk'] mb-2">No Contacts</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                You'll be able to chat once you're connected with a {role === "learner" ? "mentor" : "student"}.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
          {/* Contact list */}
          <Card className="border-border/50 md:col-span-1 flex flex-col">
            <div className="p-2 pb-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>
            <CardContent className="p-2 flex-1 overflow-auto">
              <div className="space-y-1">
                {contacts
                  .filter((c) => c.name.toLowerCase().includes(contactSearch.toLowerCase()))
                  .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContact(c)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      selectedContact?.id === c.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(c.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                    </div>
                    {c.unread > 0 && (
                      <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                        {c.unread}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chat area */}
          <Card className="border-border/50 md:col-span-2 flex flex-col">
            {selectedContact ? (
              <>
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(selectedContact.name)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-medium text-sm flex-1">{selectedContact.name}</p>
                  {showMessageSearch ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={messageSearch}
                        onChange={(e) => setMessageSearch(e.target.value)}
                        placeholder="Search messages..."
                        className="h-8 w-48 text-sm"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setShowMessageSearch(false); setMessageSearch(""); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setShowMessageSearch(true)}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages
                      .filter((m) =>
                        !messageSearch || m.body.toLowerCase().includes(messageSearch.toLowerCase())
                      )
                      .map((m) => {
                      const isMine = m.sender_id === user?.id;
                      const highlighted = messageSearch && m.body.toLowerCase().includes(messageSearch.toLowerCase());
                      return (
                        <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                              isMine
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted rounded-bl-md"
                            } ${highlighted ? "ring-2 ring-[hsl(var(--warning))]" : ""}`}
                          >
                            <p>{m.body}</p>
                            <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              {format(new Date(m.created_at), "h:mm a")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>
                <div className="p-4 border-t border-border flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  />
                  <Button onClick={sendMessage} size="icon" disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Select a contact to start chatting
              </div>
            )}
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ChatPage;
