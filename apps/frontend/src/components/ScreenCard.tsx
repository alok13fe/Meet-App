import { useEffect, useRef } from "react"

interface IScreenCard {
  userId: string;
  firstName: string;
  lastName: string;
  screenStream: MediaStream | undefined;
  handlePinned: (userId: string, type: 'video' | 'screen') => void;
}

export default function ScreenCard({ userId, firstName, lastName, screenStream, handlePinned }: IScreenCard){

  const videoRef = useRef<HTMLVideoElement|null>(null);

  useEffect(() => {
    const video = videoRef.current;

    if(video && screenStream){
      video.srcObject = screenStream;
      
      video.onloadedmetadata = () => {
        video.play();
      };
    }
  }, [screenStream]);

  return (
    <div className={`relative md:min-w-sm aspect-video shadow-sm rounded-md bg-gray-200 `}>
      <video
        ref={videoRef}
        className={`w-full h-full object-cover rounded`}
        autoPlay
        muted
      />
      <div className="w-full absolute top-3 px-3 flex justify-end">
        <div 
          className="w-6 h-6 flex items-center justify-center bg-black text-white rounded-full"
          onClick={() => { handlePinned(userId, 'screen') }}  
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pin-icon lucide-pin"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
        </div>
      </div>
      <div className="absolute bottom-3 px-3"> 
        <p className="px-3 py-1 bg-gray-300 font-medium text-sm rounded-2xl"><span className="capitalize">{firstName} {lastName}</span>&apos;s Screen</p>
      </div>
    </div>
  )
}