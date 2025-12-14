import { useEffect, useRef } from "react";

interface IAudioPlayerProps {
  audioStream: MediaStream;
}

export default function AudioPlayer({ audioStream }: IAudioPlayerProps) {
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if(audioRef.current){
      audioRef.current.srcObject = audioStream;
      audioRef.current.play().catch(err => {
        console.log("Audio auto-play failed:", err);
      });
    }
  },[audioStream]);
  
  return (
    <audio ref={audioRef} autoPlay playsInline />
  )
}
