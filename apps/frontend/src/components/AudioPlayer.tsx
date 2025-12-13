import { useEffect, useRef } from "react";

interface IAudioPlayerProps {
  audioStream: MediaStream | undefined;
}

export default function AudioPlayer({ audioStream }: IAudioPlayerProps) {
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if(audio && audioStream){
      audio.srcObject = audioStream;
      audio.play().catch(e => {
        console.log('Audio play failed:',e);
      })
    }
  },[audioStream]);
  
  return (
    <audio ref={audioRef} autoPlay playsInline />
  )
}
