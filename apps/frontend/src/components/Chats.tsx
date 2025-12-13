import { useState } from 'react'
import { useAppSelector } from '../lib/hooks';
import { useSocketContext } from '../contexts/SocketContext';
import { IChat } from './MeetPreview';

interface IChats {
  meetId: string;
  chatMessages: IChat[];
  setChatMessages: React.Dispatch<React.SetStateAction<IChat[]>>;
  onClose: () => void;
}

export default function Chats({ meetId, chatMessages, setChatMessages, onClose }: IChats) {

  const { socket } = useSocketContext();
  const { profile } = useAppSelector(state => state.user);

  const [message, setMessage] = useState('');

  function handleSendMessage(){
    if(!socket || !profile){
      return;
    }

    socket.send(JSON.stringify({
      type: 'chat',
      payload: {
        roomId: meetId,
        message
      }
    }));
    
    setChatMessages(
      prev => [
        ...prev, 
        { 
          firstName: profile?.firstName,
          lastName: profile?.lastName, 
          message 
        }
      ]
    );
    setMessage('');
  }

  return (
    <div className='fixed top-0 right-0 z-10 p-2 rounded'>
      <div className="w-80 h-[calc(100vh-16px)] flex flex-col p-4 bg-white border border-gray-500 rounded">
        <div className='flex justify-between'>
          <h3 className="font-semibold mb-4">Chat</h3>
          <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" onClick={onClose}>
          <path fillRule="evenodd" clipRule="evenodd" d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z" fill="#000000"/>
          </svg>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {
            chatMessages.length === 0 ?
            <div>
              <p className='text-sm text-center text-gray-400'>No conversations yet</p>
            </div>
            :
            <div className='space-y-1'>
              {
                chatMessages.map((chat, idx) => {
                  return (
                    <div key={idx} className={`p-2 text-sm ${idx%2 === 0 && 'bg-gray-100'}`}>
                      <p className='mb-1 font-semibold capitalize'>{chat.firstName} {chat.lastName}</p>
                      <p>{chat.message}</p>
                    </div>
                  )
                })
              }
            </div>
          }
        </div>
        <div className="flex gap-1">
          <input 
            type="text" 
            className="w-full px-3 py-1 border"
            placeholder="Send a Message..."
            value={message}
            onChange={(e) => {setMessage(e.target.value)}}
          />
          <button 
            className="px-3 py-1 bg-black font-semibold text-white rounded hover:opacity-80"
            onClick={handleSendMessage}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
