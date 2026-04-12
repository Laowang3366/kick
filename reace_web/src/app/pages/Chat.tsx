import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Smile, Users, AtSign, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../lib/api";
import { chatKeys } from "../lib/query-keys";
import { formatRelativeTime } from "../lib/format";
import { normalizeAvatarUrl, normalizeImageUrl } from "../lib/mappers";
import { useSession } from "../lib/session";
import { useNavigate } from "react-router";

const EMOJI_GROUPS = [
  { label: "常用", items: ["😀", "😊", "😂", "😍", "👍", "👏", "🎉", "🙏", "💡", "🔥"] },
  { label: "表情", items: ["😄", "😁", "😅", "🤣", "😉", "😎", "🥳", "🤔", "😭", "😴"] },
  { label: "互动", items: ["🙌", "🤝", "👌", "✌️", "👀", "✅", "❗", "💬", "📌", "⭐"] },
  { label: "办公", items: ["📊", "📈", "📉", "🧾", "📎", "📝", "📚", "💻", "⌨️", "🗂️"] },
];

type MentionState = {
  query: string;
  start: number;
  end: number;
};

export function Chat() {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLFormElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, user } = useSession();
  const navigate = useNavigate();

  const messagesQuery = useQuery({
    queryKey: chatKeys.messages(),
    queryFn: () => api.get<any[]>("/api/chat/messages?limit=50", { silent: true }),
  });
  const onlineUsersQuery = useQuery({
    queryKey: chatKeys.onlineUsers(),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    queryFn: () => api.get<{ users: any[]; total: number }>("/api/users/online?limit=200", { auth: false, silent: true }),
  });

  const messages = messagesQuery.data || [];
  const onlineUsers = onlineUsersQuery.data?.users || [];

  const mentionState = useMemo<MentionState | null>(() => {
    const textarea = inputRef.current;
    const cursor = textarea?.selectionStart ?? input.length;
    const beforeCursor = input.slice(0, cursor);
    const match = beforeCursor.match(/(^|\s)@([^\s@]*)$/);
    if (!match) return null;
    const query = match[2] || "";
    return {
      query,
      start: cursor - query.length - 1,
      end: cursor,
    };
  }, [input]);

  const mentionCandidates = useMemo(() => {
    const candidates = onlineUsers.filter((item) => item.id !== user?.id);
    if (!mentionState) return candidates.slice(0, 8);
    const keyword = mentionState.query.trim().toLowerCase();
    if (!keyword) return candidates.slice(0, 8);
    return candidates
      .filter((item) => (item.username || "").toLowerCase().includes(keyword))
      .slice(0, 8);
  }, [mentionState, onlineUsers, user?.id]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => api.post<any>("/api/chat/send", { content }),
    onSuccess: async (result) => {
      queryClient.setQueryData(chatKeys.messages(), (prev: any[] | undefined) => [...(prev || []), result]);
      await queryClient.invalidateQueries({ queryKey: chatKeys.onlineUsers() });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!mentionState) {
      setShowMentionPicker(false);
      return;
    }
    setShowMentionPicker(mentionCandidates.length > 0);
  }, [mentionCandidates.length, mentionState]);

  useEffect(() => {
    if (!showEmojiPicker && !showMentionPicker) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (composerRef.current && !composerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
        setShowMentionPicker(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showEmojiPicker, showMentionPicker]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }

    await sendMutation.mutateAsync(input.trim());
    setInput("");
    setShowEmojiPicker(false);
    setShowMentionPicker(false);
  };

  const insertEmoji = (emoji: string) => {
    setInput((prev) => `${prev}${emoji}`);
    inputRef.current?.focus();
  };

  const insertMention = (username: string) => {
    const textarea = inputRef.current;
    if (!textarea) return;
    const mentionText = `@${username} `;
    if (!mentionState) {
      const nextValue = `${input}${mentionText}`;
      setInput(nextValue);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(nextValue.length, nextValue.length);
      });
      setShowMentionPicker(false);
      return;
    }
    const nextValue = `${input.slice(0, mentionState.start)}${mentionText}${input.slice(mentionState.end)}`;
    setInput(nextValue);
    setShowMentionPicker(false);
    requestAnimationFrame(() => {
      const nextCursor = mentionState.start + mentionText.length;
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const uploadChatImage = async (file: File | null) => {
    if (!file) return;
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.info("仅支持发送图片文件");
      return;
    }
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadResult = await api.post<{ url: string }>("/api/upload", formData);
      const message = await api.post<any>("/api/chat/send", { content: buildImageMessage(uploadResult.url) });
      queryClient.setQueryData(chatKeys.messages(), (prev: any[] | undefined) => [...(prev || []), message]);
      await queryClient.invalidateQueries({ queryKey: chatKeys.onlineUsers() });
      setShowEmojiPicker(false);
      setShowMentionPicker(false);
      toast.success("图片已发送");
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="flex h-full p-6 max-w-7xl mx-auto gap-6 bg-transparent font-sans">
      <div className="flex-1 bg-white rounded-3xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col overflow-hidden relative">
        <div className="p-6 border-b border-gray-50 flex items-center gap-4 bg-white z-10 shrink-0">
          <div className="w-12 h-12 rounded-full bg-[#e8f5e9] text-[#0a9e6b] flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <h2 className="font-bold text-[18px] text-slate-800 tracking-tight">综合交流大厅</h2>
            <div className="text-[13px] text-[#0a9e6b] font-medium flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#0a9e6b]" />
              {onlineUsers.length} 人在线
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-white">
          <div className="space-y-8">
            <AnimatePresence>
              {messages.map((msg) => {
                const isMe = user?.id === msg.userId;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div className={`flex gap-3 max-w-[80%] ${isMe ? "flex-row-reverse" : ""}`}>
                      <img
                        src={normalizeAvatarUrl(msg.avatar, msg.username)}
                        alt={msg.username}
                        className="w-10 h-10 rounded-full border border-gray-100 object-cover shrink-0 mt-1"
                      />

                      <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className={`flex items-center gap-2 mb-1.5 ${isMe ? "flex-row-reverse" : ""}`}>
                          <span className="text-[13px] text-slate-500">{msg.username}</span>
                          <span className="text-[12px] text-slate-400">{formatRelativeTime(msg.createTime)}</span>
                        </div>

                        <div
                          className={`px-5 py-3.5 text-[14px] leading-relaxed shadow-sm ${
                            isMe
                              ? "bg-[#0a9e6b] text-white rounded-2xl rounded-tr-sm"
                              : "bg-white text-slate-700 rounded-2xl rounded-tl-sm border border-gray-100/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]"
                          }`}
                        >
                          <ChatMessageContent content={msg.content} isMe={isMe} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-4 bg-white shrink-0 mb-2 px-6">
          <form ref={composerRef} onSubmit={handleSend} className="flex items-center gap-4 relative">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className={`transition-colors w-10 h-10 flex items-center justify-center rounded-xl ${
                isUploadingImage ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
              title="发送图片"
            >
              <ImageIcon size={20} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  navigate("/auth");
                  return;
                }
                if (mentionCandidates.length === 0) return;
                setShowMentionPicker((prev) => !prev);
                setShowEmojiPicker(false);
                inputRef.current?.focus();
              }}
              className={`transition-colors w-10 h-10 flex items-center justify-center rounded-xl ${
                showMentionPicker ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
              title="艾特在线用户"
            >
              <AtSign size={22} />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowEmojiPicker((prev) => !prev);
                setShowMentionPicker(false);
              }}
              className={`transition-colors w-10 h-10 flex items-center justify-center rounded-xl ${
                showEmojiPicker ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
              title="插入表情"
            >
              <Smile size={22} />
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                void uploadChatImage(file);
                event.target.value = "";
              }}
            />

            {(showEmojiPicker || showMentionPicker) && (
              <div className="absolute bottom-full left-0 mb-3 z-20 w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
                {showMentionPicker && (
                  <div className="border-b border-slate-100 p-3">
                    <div className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">艾特在线用户</div>
                    <div className="space-y-1.5">
                      {mentionCandidates.map((onlineUser) => (
                        <button
                          key={onlineUser.id}
                          type="button"
                          onClick={() => insertMention(onlineUser.username)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-teal-50"
                        >
                          <img
                            src={normalizeAvatarUrl(onlineUser.avatar, onlineUser.username)}
                            alt={onlineUser.username}
                            className="h-8 w-8 rounded-full object-cover border border-slate-200"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold text-slate-800">{onlineUser.username}</div>
                            <div className="text-xs text-slate-400">Lv.{onlineUser.level || 1}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showEmojiPicker && (
                  <div className="p-3">
                    <div className="max-h-[280px] overflow-y-auto space-y-4 pr-1">
                      {EMOJI_GROUPS.map((group) => (
                        <div key={group.label}>
                          <div className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">{group.label}</div>
                          <div className="grid grid-cols-5 gap-2">
                            {group.items.map((emoji) => (
                              <button
                                key={`${group.label}-${emoji}`}
                                type="button"
                                onClick={() => insertEmoji(emoji)}
                                className="rounded-xl bg-slate-50 px-3 py-2 text-xl transition hover:bg-teal-50"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend(e);
                }
              }}
              onPaste={(e) => {
                const files = Array.from(e.clipboardData?.files || []);
                const imageFile = files.find((file) => file.type.startsWith("image/"));
                if (!imageFile) return;
                e.preventDefault();
                void uploadChatImage(imageFile);
              }}
              placeholder="输入消息，支持 @在线用户 和表情..."
              rows={1}
              className="flex-1 bg-transparent border-none text-[15px] outline-none px-2 py-3 placeholder:text-slate-300 resize-none min-h-[48px] max-h-32"
            />

            <button
              type="submit"
              disabled={!input.trim() || isUploadingImage}
              className="w-12 h-12 bg-[#0a9e6b] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-full flex items-center justify-center transition-all shadow-md shadow-[#0a9e6b]/20 shrink-0"
            >
              <Send size={18} className="ml-1" />
            </button>
          </form>
        </div>
      </div>

      <div className="w-80 hidden lg:flex flex-col gap-6 shrink-0">
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.05)] border border-gray-100 p-6 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="font-bold text-[17px] text-slate-800">在线用户</h3>
            <span className="text-[12px] bg-[#e8f5e9] text-[#0a9e6b] px-2.5 py-1 rounded-md font-bold">
              {onlineUsers.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
            {onlineUsers.map((onlineUser) => (
              <div
                key={onlineUser.id}
                className="flex items-center gap-4 cursor-pointer group"
                onClick={() => navigate(`/user/${onlineUser.id}`)}
              >
                <div className="relative">
                  <img
                    src={normalizeAvatarUrl(onlineUser.avatar, onlineUser.username)}
                    alt={onlineUser.username}
                    className="w-11 h-11 rounded-full object-cover"
                  />
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white bg-[#0a9e6b]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] text-slate-700 truncate">{onlineUser.username}</div>
                  <div className="text-[12px] text-slate-400 mt-0.5">Lv.{onlineUser.level || 1}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#f0f4ff] rounded-2xl p-4 flex items-center gap-3 border border-blue-50/50">
          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <AtSign size={16} />
          </div>
          <div className="text-[13px] text-blue-900 leading-relaxed">
            可直接点击 `@` 艾特在线用户，也可以在消息中输入 `@用户名` 触发提醒。
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatMessageContent({ content, isMe }: { content: string; isMe: boolean }) {
  if (isImageMessage(content)) {
    const imageUrl = parseImageMessage(content);
    return imageUrl ? (
      <img src={normalizeImageUrl(imageUrl)} alt="聊天室图片" className="max-h-80 rounded-xl object-cover" />
    ) : null;
  }

  return (
    <span className="whitespace-pre-wrap break-words">
      {content.split(/(@[^\s@]+)/g).map((part, index) => {
        if (/^@[^\s@]+$/.test(part)) {
          return (
            <span
              key={`${part}-${index}`}
              className={isMe ? "font-semibold text-emerald-100" : "font-semibold text-teal-600"}
            >
              {part}
            </span>
          );
        }
        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </span>
  );
}

function buildImageMessage(url: string) {
  return `[[image:${url}]]`;
}

function isImageMessage(value: string) {
  return /^\[\[image:.+\]\]$/.test(value);
}

function parseImageMessage(value: string) {
  const match = value.match(/^\[\[image:(.+)\]\]$/);
  return match ? match[1] : null;
}
