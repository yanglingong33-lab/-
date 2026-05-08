import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Image as ImageIcon, Mic, Send, Calendar, MapPin, Cat as CatIcon, MoreHorizontal, X, Heart, Shield, Activity, Info, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type MessageRole = 'agent' | 'user';

interface Message {
  id: string;
  role: MessageRole;
  text?: string;
  isCard?: boolean;
  petType?: 'cat' | 'dog';
}

interface PetDetail {
  id: string;
  name: string;
  type: 'cat' | 'dog';
  images: string[];
  location: string;
  tags: string[];
  description: string;
  gender: 'boy' | 'girl';
  age: string;
  weight: string;
  breed: string;
  story: string;
  requirements: string[];
}

const MOCK_PETS: Record<'cat' | 'dog', PetDetail> = {
  cat: {
    id: 'c1',
    name: '橘子',
    type: 'cat',
    gender: 'girl',
    age: '2岁',
    weight: '4.5kg',
    breed: '中华田园橘猫',
    images: [
      'https://images.unsplash.com/photo-1543852786-1cf6624b9987?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    ],
    location: '上海 · 猫咪领养中心',
    tags: ['橘猫', '2岁', '已绝育', '温顺亲人', '黏人小可爱'],
    description: '性格温顺，喜欢亲近人类，特别喜欢晒太阳和玩逗猫棒，希望能找到一个温暖的家。',
    story: '橘子是我们在一个雨天救助的流浪猫。当时她躲在车底瑟瑟发抖。虽然流浪过，但她对人依然充满信任，只要一摸就会咕噜咕噜，是个彻头彻尾的撒娇精。肠胃有些敏感，需要注意饮食规律。',
    requirements: ['限上海同城', '与家人同住且全家同意', '阳台封网', '科学喂养', '接受定期视频回访']
  },
  dog: {
    id: 'd1',
    name: '旺财',
    type: 'dog',
    gender: 'boy',
    age: '1岁半',
    weight: '25kg',
    breed: '金毛寻回犬',
    images: [
      'https://images.unsplash.com/photo-1552053831-71594a27632d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1537151608804-ea6f11ccfb73?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    ],
    location: '上海 · 狗狗救助站',
    tags: ['金毛', '1岁半', '已绝育', '热情开朗', '笑脸天使'],
    description: '性格热情开朗，喜欢和人类互动，特别喜欢玩飞盘和散步，希望能找到一个温暖的家。',
    story: '旺财是因为前主人搬家无法带走而被送到救助站的。他非常聪明，会坐下、握手等基本指令。性格就像小太阳一样，非常喜欢和小朋友玩耍。精力比较旺盛，每天需要保证至少一小时的户外活动。',
    requirements: ['限上海同城', '有充足时间遛狗', '办理犬证', '科学喂养', '接受定期视频回访']
  }
};

// --- Mock Data ---
const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'agent',
    text: '你好呀！我是领养助手小喵 🐾\n很高兴为你寻找命中注定的小可爱～\n先告诉小喵，你想领养猫咪还是狗呢？',
  }
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [selectedPet, setSelectedPet] = useState<PetDetail | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (overrideText?: string) => {
    const textToSend = typeof overrideText === 'string' ? overrideText : inputText;
    if (!textToSend.trim()) return;
    
    // Add User Message
    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    if (!overrideText || typeof overrideText !== 'string') setInputText('');

    // Add Loading Indicator
    const loadingId = Date.now().toString() + '-loading';
    setMessages(prev => [...prev, { id: loadingId, role: 'agent', text: '喵呜，思考中...' }]);

    try {
      const historyForApi = messages
        .filter(m => m.text) // Ignore pure cards
        .map(m => ({
          role: m.role === 'agent' ? 'assistant' : 'user',
          content: m.text
        }));
      
      historyForApi.push({ role: 'user', content: textToSend });

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyForApi })
      });

      if (!res.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await res.json();
      
      // Replace loading message with real response
      let replyText = data.reply || "";
      let isCatCard = false;
      let isDogCard = false;
      
      if (replyText.includes("[SHOW_CAT_CARD]")) {
        isCatCard = true;
        replyText = replyText.replace(/\[SHOW_CAT_CARD\]/g, "").trim();
      } else if (replyText.includes("[SHOW_DOG_CARD]")) {
        isDogCard = true;
        replyText = replyText.replace(/\[SHOW_DOG_CARD\]/g, "").trim();
      }

      setMessages(prev => {
        const newMessages = prev.filter(m => m.id !== loadingId);
        if (replyText) {
          newMessages.push({
            id: Date.now().toString(),
            role: 'agent',
            text: replyText
          });
        }
        if (isCatCard) {
          newMessages.push({
            id: Date.now().toString() + '-cat-card',
            role: 'agent',
            isCard: true,
            petType: 'cat'
          });
        }
        if (isDogCard) {
          newMessages.push({
            id: Date.now().toString() + '-dog-card',
            role: 'agent',
            isCard: true,
            petType: 'dog'
          });
        }
        // Fallback card from earlier mock if there's an old pet_card token
        if (replyText.includes("[SHOW_PET_CARD]")) {
          newMessages.push({
            id: Date.now().toString() + '-card',
            role: 'agent',
            isCard: true,
            petType: 'cat'
          });
        }
        return newMessages;
      });
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => 
        prev.filter(m => m.id !== loadingId).concat({
          id: Date.now().toString(),
          role: 'agent',
          text: '🐾 哎呀，我现在有点网络问题开小差啦，过一会儿再试试吧～'
        })
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 sm:p-0">
      {/* Mobile Frame Container */}
      <div className="w-full h-[100dvh] sm:h-[844px] sm:w-[390px] bg-[#F7F9F6] sm:rounded-[40px] sm:shadow-2xl overflow-hidden flex flex-col relative border-[8px] sm:border-gray-900">
        
        {/* Decorative Top Background Gradient */}
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-[#E6F3E6] to-transparent opacity-60 z-0"></div>

        {/* --- Header --- */}
        <header className="relative z-10 pt-12 pb-4 px-4 flex items-center justify-between">
          <button className="p-2 -ml-2 text-gray-800 hover:bg-black/5 rounded-full transition-colors">
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>
          
          <div className="flex-1 text-center mr-8">
            <h1 className="text-[20px] font-semibold text-gray-900 tracking-wide flex items-center justify-center gap-1">
              领养助手 
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-300">
                 <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" stroke="currentColor" strokeWidth="1.5" fill="#E6F4EA"/>
              </svg>
            </h1>
            <p className="text-[11px] text-gray-500 mt-0.5 tracking-wider">用爱心温暖每一个生命</p>
          </div>
          
          {/* Header decorative cat */}
          <div className="absolute right-4 top-10 flex">
             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm relative z-10 border border-green-50 overflow-hidden">
                <CatIcon className="text-gray-700" size={24} strokeWidth={1.5} />
             </div>
             <div className="absolute -top-1 -right-1 text-purple-400">
               <svg fill="currentColor" width="16" height="16" viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M15,11A1,1 0 0,1 16,10A1,1 0 0,1 17,11A1,1 0 0,1 16,12A1,1 0 0,1 15,11M7,11A1,1 0 0,1 8,10A1,1 0 0,1 9,11A1,1 0 0,1 8,12A1,1 0 0,1 7,11M12,17C10.74,17 9.58,16.29 9,15.24C9.53,15.7 10.15,16 10.82,16C12.39,16 13.82,15 14.61,13.67C14.73,14 14.82,14.37 14.82,14.74C14.82,15.03 14.76,15.31 14.66,15.58C14.07,16.43 13.09,17 12,17Z"/></svg>
             </div>
          </div>
        </header>

        {/* --- Chat Area --- */}
        <div className="flex-1 overflow-y-auto px-4 pb-32 relative z-10 space-y-5 scrollbar-hide">
          {messages.map((msg, index) => (
            <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {/* Agent Avatar */}
              {msg.role === 'agent' && (
                <div className="w-8 h-8 shrink-0 mr-2 rounded-full overflow-hidden bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-green-50 flex items-center justify-center">
                  <CatIcon size={18} strokeWidth={1.5} className="text-gray-700" />
                </div>
              )}

              {/* Message Content */}
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : 'order-2'}`}>
                {msg.text && (
                  <div 
                    className={`px-4 py-3 text-[14.5px] leading-relaxed break-words whitespace-pre-wrap
                      ${msg.role === 'user' 
                        ? 'bg-[#E3F2DA] text-gray-800 rounded-2xl rounded-tr-sm' 
                        : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-50'
                      }
                    `}
                  >
                    {msg.text}
                  </div>
                )}
                
                {/* Pet Card Render */}
                {msg.isCard && (
                  <div className="bg-white rounded-[24px] p-3 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-gray-50 w-[280px]">
                    <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100 relative mb-3">
                      <img 
                        src={msg.petType === 'dog' 
                          ? "https://images.unsplash.com/photo-1552053831-71594a27632d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
                          : "https://images.unsplash.com/photo-1543852786-1cf6624b9987?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"} 
                        alt={msg.petType === 'dog' ? "旺财" : "橘子"} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="px-1">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-lg font-bold text-gray-900">{msg.petType === 'dog' ? '旺财' : '橘子'}</h3>
                          <span className={msg.petType === 'dog' ? "text-[#4A90E2] p-0.5 bg-[#EAF2FA] rounded-full" : "text-[#FF7FA3] p-0.5 bg-[#FFF0F4] rounded-full"}>
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                               {msg.petType === 'dog' 
                                 ? <path d="M12 15v7M9 19h6M12 15a7 7 0 100-14 7 7 0 000 14z"/> // Close enough icon 
                                 : <path d="M12 15v7M9 19h6M12 15a7 7 0 100-14 7 7 0 000 14z"/>}
                             </svg>
                          </span>
                        </div>
                        <div className="flex items-center text-gray-400 text-xs">
                          <MapPin size={12} className="mr-0.5" />
                          <span>上海 · 宠物领养中心</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(msg.petType === 'dog' ? ['金毛', '1岁半', '已绝育', '热情开朗', '笑脸天使'] : ['橘猫', '2岁', '已绝育', '温顺亲人', '黏人小可爱']).map(tag => (
                          <span key={tag} className="text-[11px] text-gray-600 bg-[#F4F6F4] px-2 py-1 rounded-md whitespace-nowrap">
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <p className="text-[12px] text-gray-500 leading-relaxed max-w-[240px] mb-4">
                        {msg.petType === 'dog' 
                          ? '性格热情开朗，喜欢和人类互动，特别喜欢玩飞盘和散步，希望能找到一个温暖的家。'
                          : '性格温顺，喜欢亲近人类，特别喜欢晒太阳和玩逗猫棒，希望能找到一个温暖的家。'}
                      </p>
                      
                      <button 
                        onClick={() => setSelectedPet(MOCK_PETS[msg.petType as 'cat' | 'dog'] || MOCK_PETS.cat)}
                        className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#9A77FF] to-[#A4E0FE] text-white text-[15px] font-medium shadow-md shadow-purple-200/50 hover:opacity-90 active:scale-[0.98] transition-all"
                      >
                        查看详情
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar */}
              {msg.role === 'user' && (
                <div className="w-8 h-8 shrink-0 ml-2 order-2 rounded-full overflow-hidden bg-gray-200">
                  <img 
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80" 
                    alt="User" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          ))}
          
          {/* Suggestion Chips (bottom of chat) */}
          <div className="flex flex-wrap gap-2 pt-2 px-2">
            {(() => {
              const lastAgentMsg = messages.filter(m => m.role === 'agent' && !m.isCard).pop()?.text || "";
              
              if (messages.length <= 1 || lastAgentMsg.includes('猫咪还是狗')) {
                return [
                  { text: '我想领养猫咪 🐱' },
                  { text: '我想领养狗狗 🐶' },
                  { text: '还没有想好呢 🤔' },
                ].map(chip => (
                  <button 
                    key={chip.text}
                    className="px-4 py-2 bg-[#F3F0FF] text-[#7E57C2] text-[13px] rounded-full border border-[#E6E0F8] hover:bg-[#ebdfff] transition-colors"
                    onClick={() => handleSend(chip.text)}
                  >
                    {chip.text}
                  </button>
                ));
              }

              if (lastAgentMsg.includes('性格') || lastAgentMsg.includes('偏好') || lastAgentMsg.includes('安静') || lastAgentMsg.includes('黏人')) {
                return [
                  { text: '希望黏人一点的 🥰' },
                  { text: '活泼好动的 ⚽' },
                  { text: '安静独立的 ☕' },
                ].map(chip => (
                  <button 
                    key={chip.text}
                    className="px-4 py-2 bg-[#F3F0FF] text-[#7E57C2] text-[13px] rounded-full border border-[#E6E0F8] hover:bg-[#ebdfff] transition-colors"
                    onClick={() => handleSend(chip.text)}
                  >
                    {chip.text}
                  </button>
                ));
              }

              if (messages.some(m => m.isCard)) {
                 if (lastAgentMsg.includes('了解') || lastAgentMsg.includes('情况') || lastAgentMsg.includes('条件') || lastAgentMsg.includes('家人')) {
                   if (lastAgentMsg.includes('同住') || lastAgentMsg.includes('过敏') || lastAgentMsg.includes('疫苗')) {
                     return [
                       { text: '和家人同住，都同意养，无过敏' },
                       { text: '自己独居，可以接受绝育' },
                     ].map(chip => (
                        <button 
                          key={chip.text}
                          className="px-4 py-2 bg-[#F3F0FF] text-[#7E57C2] text-[13px] rounded-full border border-[#E6E0F8] hover:bg-[#ebdfff] transition-colors"
                          onClick={() => handleSend(chip.text)}
                        >
                          {chip.text}
                        </button>
                     ));
                   }
                   return [
                      { text: '好可爱！我想了解一下它的情况～' },
                   ].map(chip => (
                      <button 
                        key={chip.text}
                        className="px-4 py-2 bg-[#F3F0FF] text-[#7E57C2] text-[13px] rounded-full border border-[#E6E0F8] hover:bg-[#ebdfff] transition-colors"
                        onClick={() => handleSend(chip.text)}
                      >
                        {chip.text}
                      </button>
                   ));
                 }

                 if (lastAgentMsg.includes('时间') || lastAgentMsg.includes('周末') || lastAgentMsg.includes('见面') || lastAgentMsg.includes('互动')) {
                   return (
                     <>
                        {[
                          { text: '本周六上午' },
                          { text: '本周日下午' },
                          { text: '下周六上午' },
                        ].map(chip => (
                          <button 
                            key={chip.text}
                            className="px-4 py-2 bg-[#F3F0FF] text-[#7E57C2] text-[13px] rounded-full border border-[#E6E0F8] hover:bg-[#ebdfff] transition-colors"
                            onClick={() => handleSend(chip.text)}
                          >
                            {chip.text}
                          </button>
                        ))}
                        <button className="px-4 py-2 bg-white text-[#7E57C2] text-[13px] rounded-full border border-[#E6E0F8] shadow-sm flex items-center gap-1.5 hover:bg-gray-50 transition-colors">
                          <Calendar size={14} />
                          选择时间
                        </button>
                     </>
                   );
                 }

                 return [
                    { text: '好可爱！我想了解一下它的情况～' },
                 ].map(chip => (
                    <button 
                      key={chip.text}
                      className="px-4 py-2 bg-[#F3F0FF] text-[#7E57C2] text-[13px] rounded-full border border-[#E6E0F8] hover:bg-[#ebdfff] transition-colors"
                      onClick={() => handleSend(chip.text)}
                    >
                      {chip.text}
                    </button>
                 ));
              }

              return [];
            })()}
          </div>

          <div ref={messagesEndRef} />
        </div>

        {/* --- Bottom Input Bar --- */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-white shadow-[0_-10px_30px_rgba(0,0,0,0.02)] px-4 py-3 pb-safe z-20 pb-8 sm:pb-4 rounded-b-[40px]">
          <div className="flex items-center gap-3 relative">
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <ImageIcon size={24} strokeWidth={1.5} />
            </button>
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <Mic size={24} strokeWidth={1.5} />
            </button>
            
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="输入消息..." 
                className="w-full h-11 bg-[#F5F5F5] rounded-full pl-5 pr-12 text-[14px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white transition-all placeholder-gray-400 border border-transparent focus:border-purple-300"
              />
              <button 
                onClick={() => handleSend()}
                disabled={!inputText.trim()}
                className={`absolute right-1.5 top-1.5 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  inputText.trim() 
                    ? 'bg-gradient-to-br from-[#8B5CF6] to-[#A78BFA] text-white shadow-md shadow-purple-200' 
                    : 'bg-gradient-to-br from-[#8B5CF6] to-[#A78BFA] text-white opacity-80'
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="translate-x-[-1px] translate-y-[1px]">
                  <path d="M2 12l20-11-5 21-6-10-9-5 9 5 6-10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* --- Pet Detail Drawer --- */}
        <AnimatePresence>
          {selectedPet && (
            <>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedPet(null)}
                className="absolute inset-0 bg-black/40 z-40 backdrop-blur-sm sm:rounded-[32px]"
              />

              {/* Drawer Content */}
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute bottom-0 left-0 right-0 h-[85%] bg-[#FAFBFB] z-50 rounded-t-[32px] sm:rounded-b-[32px] flex flex-col overflow-hidden shadow-2xl"
              >
                {/* Header/Close */}
                <div className="absolute top-4 right-4 z-10">
                  <button 
                    onClick={() => setSelectedPet(null)}
                    className="w-8 h-8 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-colors"
                  >
                    <X size={18} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Images Gallery Container */}
                <div className="h-[40%] shrink-0 relative bg-gray-100 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
                  {selectedPet.images.map((img, idx) => (
                    <div key={idx} className="w-full h-full shrink-0 snap-center relative">
                      <img src={img} alt="Pet" className="w-full h-full object-cover" />
                      {/* Gradient overlay for text readability below */}
                      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                    </div>
                  ))}
                  {/* Indicator dots */}
                  <div className="absolute bottom-3 w-full flex justify-center gap-1.5 z-10 pointer-events-none">
                    {selectedPet.images.map((_, idx) => (
                      <div key={idx} className={`h-1.5 rounded-full bg-white transition-all ${idx === 0 ? 'w-4' : 'w-1.5 opacity-60'}`} />
                    ))}
                  </div>
                </div>

                {/* Info Content */}
                <div className="flex-1 overflow-y-auto w-full px-5 pt-6 pb-24 space-y-6">
                  
                  {/* Title & Basic Info */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                       <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                         {selectedPet.name}
                         <span className={`p-1 rounded-full ${selectedPet.gender === 'boy' ? 'bg-blue-100 text-blue-500' : 'bg-pink-100 text-pink-500'}`}>
                           {selectedPet.gender === 'boy' 
                             ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 21v-8m0 0l-5-5m5 5l5-5M11 3a4 4 0 100 8 4 4 0 000-8z"/></svg> 
                             : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 15v7M9 19h6M12 15a7 7 0 100-14 7 7 0 000 14z"/></svg>
                           }
                         </span>
                       </h2>
                       <div className="flex items-center text-sm text-gray-500">
                         <MapPin size={14} className="mr-1" />
                         {selectedPet.location}
                       </div>
                    </div>
                    
                    <div className="flex gap-2 text-[13px]">
                      <div className="bg-white border border-gray-100 px-3 py-1.5 rounded-xl shadow-sm text-gray-700 font-medium">
                        <span className="text-gray-400 font-normal mr-1">年龄</span>{selectedPet.age}
                      </div>
                      <div className="bg-white border border-gray-100 px-3 py-1.5 rounded-xl shadow-sm text-gray-700 font-medium">
                        <span className="text-gray-400 font-normal mr-1">体重</span>{selectedPet.weight}
                      </div>
                      <div className="bg-white border border-gray-100 px-3 py-1.5 rounded-xl shadow-sm text-gray-700 font-medium">
                        <span className="text-gray-400 font-normal mr-1">品种</span>{selectedPet.breed}
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  {/* Character Tags */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                      <Heart size={16} className="text-red-400 fill-red-500/20" /> 性格特点
                    </h3>
                    <div className="flex flex-wrap gap-2">
                       {selectedPet.tags.map(tag => (
                         <span key={tag} className="px-2.5 py-1 text-xs text-[#6A4BB2] bg-[#F3F0FF] rounded-md font-medium border border-[#E6DDF8]">{tag}</span>
                       ))}
                    </div>
                  </div>

                  {/* Story */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                      <BookOpen size={16} className="text-orange-400 fill-orange-500/20" /> 遇见{selectedPet.name}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed text-justify">
                      {selectedPet.story}
                    </p>
                  </div>

                  {/* Health / Requirements */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                      <Shield size={16} className="text-blue-400 fill-blue-500/20" /> 领养要求
                    </h3>
                    <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-gray-100">
                      <ul className="space-y-2.5">
                        {selectedPet.requirements.map((req, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-300 mt-1.5 shrink-0" />
                            <span className="leading-snug">{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                </div>

                {/* Bottom Action */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 pb-safe">
                  <button 
                    onClick={() => {
                        setSelectedPet(null);
                        setInputText(`我想了解领养${selectedPet.name}的具体流程`);
                        // Set timeout so state has time to update if needed
                        setTimeout(() => handleSend(`我想了解领养${selectedPet.name}的具体流程`), 100);
                    }}
                    className="w-full h-12 bg-gray-900 text-white rounded-full font-medium text-sm flex items-center justify-center gap-2 hover:bg-black active:scale-[0.98] transition-all shadow-xl shadow-gray-900/20"
                  >
                    我想领养 Ta
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
