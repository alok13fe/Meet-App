"use client"
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Lobby from "@/src/components/Lobby";
import MeetPreview from "@/src/components/MeetPreview";

export default function Meet(){

  const { meetId } = useParams();
  
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack>();
  const [audioTrack, setAudioTrack] = useState<MediaStreamTrack>();
  const [meetStarted, setMeetStarted] = useState(false);

  useEffect(() => {
    return () => {
      if(audioTrack){
        audioTrack.stop();
      }
      if(videoTrack){
        videoTrack.stop();
      }
    }
  },[audioTrack, videoTrack]);

  if(!meetStarted){
    return (
      <Lobby 
        isMicOn={isMicOn} 
        setIsMicOn={setIsMicOn} 
        isCameraOn={isCameraOn} 
        setIsCameraOn={setIsCameraOn} 
        audioTrack={audioTrack}
        setAudioTrack={setAudioTrack}
        videoTrack={videoTrack}
        setVideoTrack={setVideoTrack}
        setMeetStarted={setMeetStarted} 
      />
    )
  }

    
  return (
    <MeetPreview 
      meetId={meetId as string}
      isMicOn={isMicOn}
      setIsMicOn={setIsMicOn} 
      isCameraOn={isCameraOn} 
      setIsCameraOn={setIsCameraOn} 
      audioTrack={audioTrack}
      videoTrack={videoTrack}
      setVideoTrack={setVideoTrack}
    />
  )
}