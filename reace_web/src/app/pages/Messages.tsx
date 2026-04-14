import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Phone,
  Video,
  Image as ImageIcon,
  Smile,
  Paperclip,
  Send,
  Edit
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";
import { formatRelativeTime } from "../lib/format";
import { messageKeys } from "../lib/query-keys";
import { normalizeAvatarUrl, normalizeImageUrl } from "../lib/mappers";
import { useIsMobile } from "../components/ui/use-mobile";

export function Messages() {
  const MESSAGE_PAGE_SIZE = 20;
  const QUICK_EMOJIS = ["😀", "😊", "😂", "😍", "👍", "👏", "🎉", "🙏", "💡", "🔥"];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleConversationCount, setVisibleConversationCount] = useState(10);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);

  const conversationsQuery = useQuery({
    queryKey: messageKeys.conversations(),
    queryFn: () => api.get<{ conversations: any[] }>("/api/messages/conversations", { silent: true }),
  });
  const contacts = conversationsQuery.data?.conversations || [];

  useEffect(() => {
    if (!isMobile && contacts.length > 0 && !activeId) {
      setActiveId(contacts[0].id);
    }
  }, [activeId, contacts, isMobile]);

  const threadQuery = useInfiniteQuery({
    queryKey: messageKeys.thread(activeId || "none"),
    enabled: Boolean(activeId),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.get<{ messages: any[]; total: number; current: number; pages: number }>(
      `/api/messages/${activeId}?page=${pageParam}&limit=${MESSAGE_PAGE_SIZE}`,
      { silent: true }
    ),
    getNextPageParam: (lastPage) => {
      if (!lastPage.current || !lastPage.pages || lastPage.current >= lastPage.pages) {
        return undefined;
      }
      return lastPage.current + 1;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (conversationId: number) => api.put(`/api/messages/${conversationId}/read`, {}, { silent: true }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: messageKeys.conversations() }),
        queryClient.invalidateQueries({ queryKey: messageKeys.unreadCount() }),
      ]);
    },
  });

  useEffect(() => {
    if (!activeId || !threadQuery.data) return;
    markReadMutation.mutate(activeId);
  }, [activeId, threadQuery.data]);

  const filteredContacts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return contacts;
    return contacts.filter((item) => (item.user?.username || "").toLowerCase().includes(keyword));
  }, [contacts, searchQuery]);

  const visibleContacts = useMemo(
    () => filteredContacts.slice(0, visibleConversationCount),
    [filteredContacts, visibleConversationCount]
  );

  const activeContact = useMemo(() => contacts.find((item) => item.id === activeId) || null, [activeId, contacts]);
  const activeMessages = useMemo(() => {
    if (!activeId) return [];
    return [...(threadQuery.data?.pages || [])]
      .reverse()
      .flatMap((page) => page.messages || []);
  }, [activeId, threadQuery.data]);

  const previewConversationText = (value: string | undefined) => {
    if (!value) return "";
    if (isImageMessage(value)) return "[图片]";
    if (isAttachmentMessage(value)) {
      const attachment = parseAttachmentMessage(value);
      return attachment ? `[附件] ${attachment.name}` : "[附件]";
    }
    return value;
  };

  const sendMutation = useMutation({
    mutationFn: () => api.post<{ message: any }>("/api/messages", {
      receiverId: activeId,
      content: input.trim(),
    }),
    onSuccess: async () => {
      setInput("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: messageKeys.conversations() }),
        queryClient.invalidateQueries({ queryKey: messageKeys.thread(activeId || "none") }),
        queryClient.invalidateQueries({ queryKey: messageKeys.unreadCount() }),
      ]);
    },
  });

  const handleSend = async () => {
    if (!activeId || !input.trim()) return;
    await sendMutation.mutateAsync();
  };

  const handleUploadAsset = async (files: FileList | null, kind: "image" | "attachment") => {
    const file = files?.[0];
    if (!file || !activeId) return;
    if (kind === "image" && !file.type.startsWith("image/")) {
      return;
    }
    setIsUploadingAsset(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadResult = await api.post<{ url: string }>("/api/upload", formData);
      const content = kind === "image"
        ? buildImageMessage(uploadResult.url)
        : buildAttachmentMessage(file.name, uploadResult.url);
      await api.post<{ message: any }>("/api/messages", {
        receiverId: activeId,
        content,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: messageKeys.conversations() }),
        queryClient.invalidateQueries({ queryKey: messageKeys.thread(activeId || "none") }),
        queryClient.invalidateQueries({ queryKey: messageKeys.unreadCount() }),
      ]);
    } finally {
      setIsUploadingAsset(false);
    }
  };

  const conversationList = (
    <div className={`${isMobile ? "w-full" : "w-80 border-r border-gray-100"} flex flex-col bg-gray-50/30 shrink-0`}>
        <div className="h-16 px-5 border-b border-gray-100 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-white border border-gray-200 text-slate-500 flex items-center justify-center hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-colors"
              title="返回"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="font-bold text-lg text-slate-800">私信与通知</h2>
          </div>
          <button className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center hover:bg-teal-100 transition-colors">
            <Edit size={16} />
          </button>
        </div>

        <div className="p-4 bg-white/50 backdrop-blur-sm sticky top-16 z-10 border-b border-gray-50">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索联系人..."
              className="w-full bg-gray-100/80 border-transparent focus:bg-white focus:border-teal-500 rounded-xl py-2.5 pl-9 pr-4 text-sm transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-200">
          {visibleContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => setActiveId(contact.id)}
              className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${
                activeId === contact.id
                  ? "bg-teal-50/50 border-teal-100/50 shadow-sm shadow-teal-100/20"
                  : "bg-transparent border-transparent hover:bg-gray-50 hover:border-gray-100"
              }`}
            >
              <div className="relative">
                <img src={normalizeAvatarUrl(contact.user?.avatar, contact.user?.username)} alt={contact.user?.username} className="w-12 h-12 rounded-full object-cover border border-gray-200/50" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-sm font-bold truncate ${activeId === contact.id ? "text-teal-700" : "text-slate-700"}`}>
                    {contact.user?.username}
                  </span>
                  <span className={`text-[11px] font-medium ${activeId === contact.id ? "text-teal-600" : "text-slate-400"}`}>
                    {formatRelativeTime(contact.lastMessageTime)}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <p className={`text-xs truncate ${contact.unreadCount > 0 ? "font-semibold text-slate-700" : "text-slate-500"}`}>
                    {previewConversationText(contact.lastMessage)}
                  </p>
                  {contact.unreadCount > 0 && (
                    <span className="w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
                      {contact.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {contacts.length === 0 && <div className="p-6 text-center text-sm text-slate-400">暂无会话</div>}
          {filteredContacts.length > visibleConversationCount && (
            <div className="p-3 text-center">
              <button
                onClick={() => setVisibleConversationCount((prev) => prev + 10)}
                className="text-sm font-medium text-slate-400 hover:text-teal-600 transition-colors"
              >
                加载更多会话...
              </button>
            </div>
          )}
        </div>
      </div>
  );

  const threadPanel = (
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {activeContact ? (
          <>
            <div className="h-16 px-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                {isMobile ? (
                  <button
                    type="button"
                    onClick={() => setActiveId(null)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                  >
                    <ArrowLeft size={18} />
                  </button>
                ) : null}
                <img src={normalizeAvatarUrl(activeContact.user?.avatar, activeContact.user?.username)} alt={activeContact.user?.username} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">{activeContact.user?.username}</h3>
                  <div className="text-xs text-slate-400">最近活跃 {formatRelativeTime(activeContact.lastMessageTime)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="w-10 h-10 rounded-full text-slate-400 hover:text-teal-600 hover:bg-teal-50 flex items-center justify-center transition-colors">
                  <Phone size={18} />
                </button>
                <button className="w-10 h-10 rounded-full text-slate-400 hover:text-teal-600 hover:bg-teal-50 flex items-center justify-center transition-colors">
                  <Video size={18} />
                </button>
                <button className="w-10 h-10 rounded-full text-slate-400 hover:text-teal-600 hover:bg-teal-50 flex items-center justify-center transition-colors">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="space-y-6 flex flex-col">
                {threadQuery.hasNextPage && (
                  <div className="text-center">
                    <button
                      onClick={() => threadQuery.fetchNextPage()}
                      disabled={threadQuery.isFetchingNextPage}
                      className="text-sm font-medium text-slate-400 hover:text-teal-600 transition-colors"
                    >
                      {threadQuery.isFetchingNextPage ? "加载中..." : "加载更早消息..."}
                    </button>
                  </div>
                )}
                <AnimatePresence>
                  {activeMessages.map((msg, idx) => {
                    const isMe = msg.sender?.id !== activeId;
                    return (
                      <motion.div
                        key={msg.id || `${idx}-${msg.createdAt}`}
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25, delay: idx * 0.03 }}
                        className={`flex flex-col max-w-[70%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
                      >
                        <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe ? "bg-teal-500 text-white rounded-tr-sm shadow-teal-500/20" : "bg-white text-slate-700 border border-gray-100 rounded-tl-sm"}`}>
                          <MessageBubbleContent content={msg.content} />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1.5 px-1">{formatRelativeTime(msg.createdAt)}</span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-100">
              <div className="flex items-center gap-2 mb-3 px-2">
                <button
                  className="text-slate-400 hover:text-teal-600 transition-colors p-1.5 hover:bg-teal-50 rounded-lg"
                  onClick={() => document.getElementById("message-image-input")?.click()}
                  title="发送图片"
                >
                  <ImageIcon size={18} />
                </button>
                <button
                  className="text-slate-400 hover:text-teal-600 transition-colors p-1.5 hover:bg-teal-50 rounded-lg"
                  onClick={() => document.getElementById("message-attachment-input")?.click()}
                  title="发送附件"
                >
                  <Paperclip size={18} />
                </button>
                <button
                  className={`text-slate-400 hover:text-teal-600 transition-colors p-1.5 hover:bg-teal-50 rounded-lg ${showEmojiPicker ? "bg-teal-50 text-teal-600" : ""}`}
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  title="插入表情"
                >
                  <Smile size={18} />
                </button>
                <input
                  id="message-image-input"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    void handleUploadAsset(e.target.files, "image");
                    e.target.value = "";
                  }}
                />
                <input
                  id="message-attachment-input"
                  type="file"
                  accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.webp"
                  className="hidden"
                  onChange={(e) => {
                    void handleUploadAsset(e.target.files, "attachment");
                    e.target.value = "";
                  }}
                />
              </div>
              {showEmojiPicker && (
                <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="grid grid-cols-5 gap-2">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setInput((prev) => `${prev}${emoji}`);
                          setShowEmojiPicker(false);
                        }}
                        className="rounded-xl bg-white px-3 py-2 text-xl transition hover:bg-teal-50"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={`发送给 ${activeContact.user?.username}...`}
                  className="flex-1 bg-gray-50 border border-gray-200/80 focus:bg-white focus:border-teal-500 rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-4 focus:ring-teal-500/10 resize-none h-12 min-h-[48px] max-h-32 shadow-inner-sm scrollbar-thin"
                  rows={1}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isUploadingAsset}
                  className="w-12 h-12 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl flex items-center justify-center transition-all shadow-sm disabled:shadow-none shrink-0"
                >
                  <Send size={18} className={input.trim() ? "translate-x-0.5" : ""} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">选择一个会话开始聊天</div>
        )}
      </div>
  );

  return (
    <div className="flex h-full max-w-7xl mx-auto bg-white overflow-hidden shadow-sm">
      {isMobile ? (activeId ? threadPanel : conversationList) : (
        <>
          {conversationList}
          {threadPanel}
        </>
      )}
    </div>
  );
}

function buildImageMessage(url: string) {
  return `[[image:${url}]]`;
}

function buildAttachmentMessage(name: string, url: string) {
  return `[[attachment:${name}|${url}]]`;
}

function isImageMessage(value: string) {
  return /^\[\[image:.+\]\]$/.test(value);
}

function parseImageMessage(value: string) {
  const match = value.match(/^\[\[image:(.+)\]\]$/);
  return match ? match[1] : null;
}

function isAttachmentMessage(value: string) {
  return /^\[\[attachment:.+\|.+\]\]$/.test(value);
}

function parseAttachmentMessage(value: string) {
  const match = value.match(/^\[\[attachment:(.+)\|(.+)\]\]$/);
  return match ? { name: match[1], url: match[2] } : null;
}

function MessageBubbleContent({ content }: { content: string }) {
  if (isImageMessage(content)) {
    const imageUrl = parseImageMessage(content);
    return imageUrl ? (
      <img src={normalizeImageUrl(imageUrl)} alt="图片消息" className="max-h-72 rounded-xl object-cover" />
    ) : null;
  }

  if (isAttachmentMessage(content)) {
    const attachment = parseAttachmentMessage(content);
    return attachment ? (
      <a
        href={normalizeImageUrl(attachment.url)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 underline-offset-2 hover:underline"
      >
        <Paperclip size={14} />
        {attachment.name}
      </a>
    ) : null;
  }

  return <span>{content}</span>;
}
