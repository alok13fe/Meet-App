import { useState, useEffect, useRef, useCallback } from "react"
import type { Dispatch, SetStateAction } from "react"
import { useAppSelector } from "../lib/hooks";
import Navbar from "./Navbar"

interface ILobbyProps {
  isMicOn: boolean;
  setIsMicOn: Dispatch<SetStateAction<boolean>>;
  isCameraOn: boolean;
  setIsCameraOn: Dispatch<SetStateAction<boolean>>;
  videoTrack: MediaStreamTrack | undefined;
  setVideoTrack: Dispatch<SetStateAction<MediaStreamTrack | undefined>>;
  audioTrack: MediaStreamTrack | undefined;
  setAudioTrack: Dispatch<SetStateAction<MediaStreamTrack | undefined>>;
  setMeetStarted: Dispatch<SetStateAction<boolean>>;
}

export default function Lobby({ isMicOn, setIsMicOn, isCameraOn, setIsCameraOn, videoTrack, setVideoTrack, audioTrack, setAudioTrack, setMeetStarted }: ILobbyProps) {
  
  const initializeRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const [error, setError] = useState('');

  const { profile }= useAppSelector(state => state.user);

  const getUserMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});

      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      setError('');
      if(videoTracks.length > 0){
        setIsCameraOn(true);
        setVideoTrack(videoTracks[0]);
      }
      if(videoTracks.length > 0){
        setIsMicOn(true);
        setAudioTrack(audioTracks[0]);
      }
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'name' in error && (error as { name?: unknown }).name === "NotAllowedError") {
        setError('You have denied camera access in your browser. Please allow camera access from browser settings and refresh to continue.');

        console.log('You have denied camera access in your browser. Please allow camera access from browser settings and refresh to continue.');
      }
      else if (typeof error === 'object' && error !== null && 'message' in error) {
        console.log(error);
        setError((error as { message?: string }).message || 'An error occurred');
      }
      else {
        console.log(error);
        setError('An unknown error occurred');
      }
    }
  },[setIsMicOn, setIsCameraOn, setAudioTrack, setVideoTrack]);

  useEffect(() => {
    if(!initializeRef.current){
      initializeRef.current = true;

      getUserMedia();
    }
  },[getUserMedia]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && videoTrack) {
      video.srcObject = new MediaStream([videoTrack]);
      
      video.onloadedmetadata = () => {
        video.play();
      };
    }
  }, [videoTrack]);

  const toggleAudio = () => {
    if(!audioTrack){
      return;
    }
    // eslint-disable-next-line
    audioTrack.enabled = !isMicOn;
    setIsMicOn(curr => !curr);
  }

  const toggleVideo = async () => {
    if(isCameraOn){
      if(videoTrack){
        videoTrack.stop();
      }
      setVideoTrack(undefined);
      setIsCameraOn(false);
    }
    else{
      const stream = await navigator.mediaDevices.getUserMedia({video: true});
      const newTrack = stream.getVideoTracks()[0];
      setVideoTrack(newTrack);
      setIsCameraOn(true);
    }
  }

  const handleJoinMeet = () => {
    if(!profile){
      console.log('Please login!');
      return;
    }

    setMeetStarted(true);
  }

  return (
    <>
      <Navbar />
      <main>
        <section className='w-full min-h-[calc(100vh-60px)] p-5 md:p-10 sm:flex justify-center items-center'>
          <div className='flex flex-col items-center'>
            <div className='mb-5 text-center'>
              <p className='mb-2 text-3xl font-bold'>Ready to Join?</p>
              <p className='text-gray-500'>Set up your camera and microphone before joining.</p>
            </div>

            <div className='relative mb-5 w-full md:w-auto min-w-0 md:min-w-2xl aspect-video bg-gray-300'>
              <video 
                ref={videoRef}
                className={`w-full ${isCameraOn? 'block': 'hidden'} aspect-video object-cover transform -scale-x-100`}
                autoPlay
                muted
              />
              <div className='mb-2 absolute bottom-0 left-0 w-full flex justify-center gap-5'>
                <div 
                  className='h-11 w-11 bg-black text-white flex items-center justify-center rounded-full'
                  onClick={toggleAudio}
                >
                  {
                    isMicOn ?
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic-icon lucide-mic"><path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/></svg>
                    :
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic-off-icon lucide-mic-off"><path d="M12 19v3"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M16.95 16.95A7 7 0 0 1 5 12v-2"/><path d="M18.89 13.23A7 7 0 0 0 19 12v-2"/><path d="m2 2 20 20"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/></svg>
                  }
                </div>

                <div 
                  className='h-11 w-11 bg-black text-white flex items-center justify-center rounded-full'
                  onClick={toggleVideo}
                >
                  {
                    isCameraOn ?
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-camera-icon lucide-camera"><path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"/><circle cx="12" cy="13" r="3"/></svg>
                    :
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-camera-off-icon lucide-camera-off"><path d="M14.564 14.558a3 3 0 1 1-4.122-4.121"/><path d="m2 2 20 20"/><path d="M20 20H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 .819-.175"/><path d="M9.695 4.024A2 2 0 0 1 10.004 4h3.993a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v7.344"/></svg>
                  }
                </div>
              </div>
            </div>
            
            <button 
              className='px-2 py-1 bg-black text-white font-semibold border-black border-2 rounded'
              onClick={handleJoinMeet}
            >
              Enter Meeting
            </button>
          </div>
        </section>
      </main>
    </>
  );
}
