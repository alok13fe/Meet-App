import { useEffect, useRef } from "react"

interface IUserCard {
  userId: string;
  firstName: string;
  lastName: string;
  isMicOn: boolean | undefined;
  videoStream: MediaStream | undefined;
  handlePinned: (userId: string, type: 'video' | 'screen') => void;
}

export default function UserCard({ userId, firstName, lastName, isMicOn, videoStream, handlePinned }: IUserCard){

  const videoRef = useRef<HTMLVideoElement|null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && videoStream) {
      video.srcObject = videoStream;
      
      video.onloadedmetadata = () => {
        video.play();
      };
    }
  }, [videoStream]);

  return (
    <div className={`relative md:min-w-sm aspect-video shadow-sm rounded-md bg-gray-200 `}>
      <video
        ref={videoRef}
        className={`w-full aspect-video object-cover rounded ${videoStream ? 'block' : 'hidden'} transform -scale-x-100`}
        autoPlay
        muted
      />
      <div className="w-full absolute top-3 px-3 flex justify-end">
        <div 
          className="w-6 h-6 flex items-center justify-center bg-white rounded-full"
          onClick={() => { handlePinned(userId, 'video') }} 
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pin-icon lucide-pin"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
        </div>
      </div>
      <div className="w-full absolute bottom-3 px-3 flex justify-between items-center"> 
        <p className="px-3 py-1 bg-gray-300 font-medium text-sm capitalize rounded-2xl">{firstName} {lastName}</p>
        <div className={`w-6 h-6 flex items-center justify-center bg-white rounded-full ${isMicOn ? 'invisible': 'visible'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic-off-icon lucide-mic-off"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
        </div>
      </div>
    </div>
  )
}