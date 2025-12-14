import { useState, useRef, useEffect, useCallback, useMemo, Dispatch, SetStateAction } from 'react';
import * as mediasoupClient from 'mediasoup-client';
import { useSocketContext } from '../contexts/SocketContext';
import { ITransportCreated, IProducer, IConsumer, IJoinSuccess, IProducerAction } from "@repo/common/payload";
import { useRouter } from 'next/navigation';
import UserCard from './UserCard';
import ScreenCard from './ScreenCard';
import Participants from './Participants';
import Chats from './Chats';
import AudioPlayer from './AudioPlayer';

interface MeetPreviewProps{
  meetId: string | undefined;
  isMicOn: boolean;
  setIsMicOn: React.Dispatch<SetStateAction<boolean>>;
  isCameraOn: boolean;
  setIsCameraOn: React.Dispatch<SetStateAction<boolean>>;
  audioTrack: MediaStreamTrack | undefined;
  videoTrack: MediaStreamTrack | undefined;
  setVideoTrack: Dispatch<SetStateAction<MediaStreamTrack | undefined>>;
}

export interface IRemoteTrack {
  stream: MediaStream;
  consumer: mediasoupClient.types.Consumer;
  isPaused?: boolean;
}

export interface IRemoteUser {
  id: string;
  firstName: string;
  lastName: string;
  audio?: IRemoteTrack;
  video?: IRemoteTrack;
  screen?: IRemoteTrack;
}

interface IProducers{
  audioProducer: mediasoupClient.types.Producer | null;
  videoProducer: mediasoupClient.types.Producer | null;
  screenProducer: mediasoupClient.types.Producer | null;
}

export interface IChat {
  firstName: string;
  lastName: string;
  message: string;
}

export default function MeetPreview({ meetId, isMicOn, setIsMicOn, isCameraOn, setIsCameraOn, audioTrack, videoTrack, setVideoTrack } : MeetPreviewProps) {

  const router = useRouter();
  const { socket, loading} = useSocketContext();
  
  const [device, setDevice] = useState<mediasoupClient.types.Device | null>(null);
  const [producerTransport, setProducerTransport] = useState<mediasoupClient.types.Transport>();
  const [consumerTransport, setConsumerTransport] = useState<mediasoupClient.types.Transport>();
  const [remoteUsers, setRemoteUsers] = useState<Map<string, IRemoteUser>>(new Map());
  const [producers, setProducers] = useState<IProducers>({
    audioProducer: null,
    videoProducer: null,
    screenProducer: null
  });
  const [initialProducers, setInitialProducers] = useState<IProducer[]>([]);
  const [pendingProducers, setPendingProducers] = useState<Record<string, IProducer>>({});
  
  const intializeRef = useRef(false);
  const sharedScreenRef = useRef<HTMLVideoElement | null>(null);
  const [shareScreen, setShareScreen] = useState(false);
  const [shareScreenStream, setShareScreenStream] = useState<MediaStream>();
  const [showMessages, setShowMessages] = useState(false);
  const [chatMessages, setChatMessages] = useState<IChat[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [pinned, setPinned] = useState<{ userId: string, type: 'video'|'screen' } | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(2);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);

  const loadDevice = useCallback(async (routerRtpCapabilities: mediasoupClient.types.RtpCapabilities) => {
    try {
      const newDevice = new mediasoupClient.Device();
      await newDevice.load({ routerRtpCapabilities });
      
      setDevice(newDevice);
    } catch (error) {
      console.log("Failed to load Mediasoup device:", error);
      alert("Your browser is not supported or connection failed.");
      router.push('/');
    }
  },[router]);

  const publish = useCallback(() => {
    if(!socket){
      return;
    }

    socket.send(JSON.stringify({
      type: "createProducerTransport",
      payload: {
        forceTcp: false,
        rtpCapabilities: device?.rtpCapabilities
      }
    }));
  },[socket, device]);

  const subscribe = useCallback(() => {
    if(!socket){
      return;
    }

    socket.send(JSON.stringify({
      type: "createConsumerTransport",
      payload: {
        forceTcp: false,
      }
    }));
  },[socket]);

  const onProducerTransportCreated = useCallback(async (payload: ITransportCreated) => {
    if(!socket){
      return;
    }
    
    const transport = device?.createSendTransport(payload.params);
    if(!transport){
      console.log("Couldn't create Producer Transport.");
      return;
    }

    setProducerTransport(transport);

    transport.on('connect', async({dtlsParameters}, callback, errback) => {
      console.log('transport connecting...');
      
      function connectHandler(event: MessageEvent){
        const parsedData = JSON.parse(event.data);
        if(parsedData.type === 'producerConnected'){
          callback();
          socket?.removeEventListener('message', connectHandler);
        }
      }
      socket.addEventListener('message', connectHandler);

      socket.send(JSON.stringify({
        type: 'connectProducerTransport',
        payload: {
          dtlsParameters
        }
      }));
    });

    transport.on('produce', async({kind, rtpParameters, appData}, callback, errback) => {
      function produceHandler(event: MessageEvent){
        const parsedData = JSON.parse(event.data);
        if(parsedData.type === 'produced'){
          callback(parsedData.payload.id);
          socket?.removeEventListener('message', produceHandler);
        }
      }
      socket.addEventListener('message', produceHandler);

      socket.send(JSON.stringify({
        type: 'produce',
        payload: {
          transportId: transport.id,
          kind, 
          rtpParameters,
          appData
        }
      }));
    });

    transport.on('connectionstatechange', (state) => {
      switch(state) {
        case 'connecting':
          console.log('publishing...');
          break;
        case 'connected':
          console.log('published');
          break;
        case 'failed':
          transport.close();  
          console.log('failed');
          break;
        default:
          break;
      }
    });

    try {
      if(videoTrack !== undefined){
        const videoProducer = await transport.produce({
          track: videoTrack,
          appData: { type: 'video', roomId: meetId }
        });

        setProducers(prev => {
          prev.videoProducer = videoProducer;
          return prev;
        });
      }
      if(audioTrack){
         const audioProducer = await transport.produce({
          track: audioTrack,
          appData: { type: 'audio', roomId: meetId }
        });

        setProducers(prev => {
          prev.audioProducer = audioProducer;
          return prev;
        });
      }
    } catch (error) {
      console.log(error);
    }
  }, [device, socket, meetId, videoTrack, audioTrack]);

  const onSubTransportCreated = useCallback((payload: ITransportCreated) => {
    if(!socket || !device){
      return;
    }

    const transport = device?.createRecvTransport(payload.params);
    setConsumerTransport(transport);

    transport?.on('connect', async({dtlsParameters}, callback, errback) => {
      function connectHandler(event: MessageEvent){
        const parsedData = JSON.parse(event.data);
        if(parsedData.type === 'subConnected'){
          callback();
          socket?.removeEventListener('message', connectHandler);
        }
      }
      socket.addEventListener('message', connectHandler);
      
      socket.send(JSON.stringify({
        type: 'connectConsumerTransport',
        payload: {
          transportId: transport.id,
          dtlsParameters
        }
      }));
    });

    transport?.on('connectionstatechange', (state) => {
      switch(state) {
        case 'connecting':
          console.log('subscribing...');
          break;
        case 'connected':
          console.log('subscribed');
          break;
        case 'failed':
          transport.close();
          break;
        default:
          break;
      }
    });

  },[socket, device]);

  const handleNewProducer = useCallback(async (payload: IProducer) => {
    if(!socket || !device){
      return;
    }

    const { rtpCapabilities } = device;
    const { id, userId, kind, type } = payload;

    setPendingProducers(prev => ({
      ...prev,
      [id]: { id, userId, kind, type }
    }));

    socket.send(JSON.stringify({
      type: 'consume',
      payload: {
        producerId: id,
        rtpCapabilities
      }
    }));
  },[socket, device]);

  const onSubscribed = useCallback(async (payload: {consumer: IConsumer}) => {
    if(!socket || !consumerTransport){
      return;
    }

    // const codecOptions = {};
    const { producerId, id, kind, rtpParameters } = payload.consumer;

    const info = pendingProducers[producerId];
    if(!info){
      console.log('Info not found');
      return;
    }
    const { userId, type } = info;
    
    const consumer = await consumerTransport.consume({
      id,
      producerId,
      kind,
      rtpParameters
    });

    const stream = new MediaStream();
    stream.addTrack(consumer.track);

    setRemoteUsers(prev => {
      const next = new Map(prev);

      const peer = next.get(userId);
      if(!peer){
        return next;
      }

      const newPeer = {
        ...peer,
        [type]: { consumer, stream }
      }

      if(type === 'audio' && newPeer.audio){
        newPeer.audio.isPaused = false;
      }

      if(!shareScreen && pinned === null && type === 'screen'){
        setPinned({
          userId: newPeer.id,
          type: 'screen'
        });
      }

      next.set(userId, newPeer);
      return next;
    });

    setPendingProducers(prev => {
      const next = {...prev};
      delete next[producerId];
      return next;
    });

    socket.send(JSON.stringify({
      type: 'resume',
      payload: {
        id
      }
    }));
  },[socket, consumerTransport, pendingProducers, shareScreen, pinned]);

  const handleProducerPaused = async (payload: IProducerAction) => {
    const { userId, type } = payload;

    if(!userId){
      console.log('User Id not found');
      return;
    }

    setRemoteUsers(prev => {
      const next = new Map(prev);
      
      const peer = next.get(userId);
      if(peer){
        if(type === 'audio' && peer.audio){
          peer.audio.consumer.pause();
          peer.audio.isPaused = true;
        }
      }
      return next;
    });
  }

  const handleProducerResumed = async (payload: IProducerAction) => {
    const { userId, type } = payload;

    if(!userId){
      console.log('User Id not found');
      return;
    }

    setRemoteUsers(prev => {
      const next = new Map(prev);
      
      const peer = next.get(userId);
      if(peer){
        if(type === 'audio' && peer.audio){
          peer.audio.consumer.resume();
          peer.audio.isPaused = false;
        }
      }
      return next;
    });
  }

  const handleProducerClosed = useCallback(async (payload: IProducerAction) => {
    const { userId, type } = payload;

    if(!userId){
      console.log('User Id not found');
      return;
    }

    if(pinned?.userId === userId && pinned?.type === 'screen'){
      setPinned(null);
    }

    setRemoteUsers(prev => {
      const next = new Map(prev);
      
      const peer = next.get(userId);
      if(peer){
        if(type === 'video'){
          peer.video?.consumer.close();
          peer.video = undefined;
        }
        else if(type === 'screen'){
          peer.screen?.consumer.close();
          peer.screen = undefined;
        }
      }
      return next;
    });
  },[pinned]);

  const handleUserJoined =  (payload: {user: IRemoteUser}) => {
    setRemoteUsers(prev => {
      const { id, firstName, lastName } = payload.user;
      const next = new Map(prev);
      
      const peer = next.get(id);
      if(peer){
        return next;
      }

      const newPeer = {
        id,
        firstName,
        lastName
      };

      next.set(id, newPeer);
      return next;
    });
  }

  const handleUserLeft = useCallback((payload: {user: Partial<IRemoteUser>}) => {
    const { id } = payload.user;

    if(!id){
      return;
    }
    
    if(pinned?.userId === id){
      setPinned(null);
    }

    setRemoteUsers(prev => {
      const next = new Map(prev);
      
      const peer = next.get(id);
      if(peer){
        peer.audio?.consumer.close();
        peer.video?.consumer.close();
        peer.screen?.consumer.close();
        next.delete(id);
      }
      return next;
    });
  },[pinned]);

  const handleJoinSuccess = (payload: IJoinSuccess) => {
    setRemoteUsers(prev => {
      const next = new Map(prev);

      payload.users.forEach(user => {
        next.set(user.id, {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName
        })
      });
      return next;
    });
    setInitialProducers(payload.producers);
  }

  const handleChat = (payload: IChat) => {
    setChatMessages(prev => [...prev, payload]);
  }

  const handleMessage = useCallback(async (event: MessageEvent) => {
    const parsedData = JSON.parse(event.data);
    console.log(parsedData);
    
    switch(parsedData.type){
      case 'routerCapabilities':
        loadDevice(parsedData.payload.rtpCapabilities);
        break;
      case 'producerTransportCreated':
        onProducerTransportCreated(parsedData.payload);
       break;
      case 'subTransportCreated':
        onSubTransportCreated(parsedData.payload);
        break;
      case 'resumed':
        console.log(parsedData.payload.message);
        break;
      case 'subscribed':
        onSubscribed(parsedData.payload);
        break;
      case 'newProducer':
        handleNewProducer(parsedData.payload);
        break;
      case 'producerPaused':
        handleProducerPaused(parsedData.payload);
        break;
      case 'producerResumed':
        handleProducerResumed(parsedData.payload);
        break;
      case 'producerClosed':
        handleProducerClosed(parsedData.payload);
        break;
      case 'user-joined':
        handleUserJoined(parsedData.payload);
        break;
      case 'user-left':
        handleUserLeft(parsedData.payload);
        break;
      case 'join-success':
        handleJoinSuccess(parsedData.payload);
        break;
      case 'chat':
        handleChat(parsedData.payload);
        break;
      default:
        break;
    }
  },[loadDevice, onProducerTransportCreated, onSubTransportCreated, onSubscribed, handleNewProducer, handleProducerClosed, handleUserLeft]);

  const toggleScreenShare = useCallback(async() => {
    if(shareScreen){
      if(socket){
        socket.send(JSON.stringify({
          type: 'producerClosed',
          payload: {
            roomId: meetId,
            type: 'screen'
          }
        }));
      }

      if(shareScreenStream){
        shareScreenStream.getTracks().forEach(track => track.stop());
      }

      producers.screenProducer?.close();
      setProducers(prev => {
        prev.screenProducer = null;
        return prev;
      });
      setShareScreenStream(undefined);
    }
    else{
      const screen = await navigator.mediaDevices.getDisplayMedia({video: true});
      
      if(producerTransport){
        const screenProducer = await producerTransport.produce({
          track: screen.getVideoTracks()[0],
          appData: { type: 'screen', roomId: meetId }
        });
        
        setProducers(prev => {
          prev.screenProducer = screenProducer;
          return prev;
        });
      }

      setPinned(null);
      setShareScreenStream(screen);
    }

    setShareScreen(curr => !curr);
  },[socket, meetId, producerTransport, producers.screenProducer, shareScreen, shareScreenStream]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if(width >= 1280){
        setItemsPerPage(6);
      }
      else if(width >= 768){
        setItemsPerPage(4);
      }
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    }
  }, []);
  
  useEffect(() => {
    if(socket && !loading){
      if(intializeRef.current){
        return;
      }

      intializeRef.current = true;
      socket.send(JSON.stringify({
        type: 'join-room',
        payload: {
          roomId: meetId
        }
      }));

      socket.send(JSON.stringify({
        type: "getRouterRtpCapabilities"
      }));
    }

    return () => {
      if(socket){
        socket.send(JSON.stringify({
          type: 'leave-room',
          payload: {
            roomId: meetId
          }
        }));
      }
    }
  },[socket, loading, meetId]);

  useEffect(() => {
    if (!socket) {
      return;
    }
    
    socket.addEventListener('message', handleMessage);
    return () => {
      socket.removeEventListener('message', handleMessage);
    }
  },[socket, handleMessage]);

  useEffect(() => {
    if(device && socket){
      publish();
      subscribe();
    }
  },[device, socket, publish, subscribe]);

  useEffect(() => {
    if(consumerTransport && initialProducers.length > 0){
      initialProducers.forEach(producer => {
        handleNewProducer(producer);
      });

      setInitialProducers([]);
    }
  },[consumerTransport, initialProducers, handleNewProducer]);

  useEffect(() => {
    const video = sharedScreenRef.current;
    if (video && shareScreenStream) {
      video.srcObject = shareScreenStream;
      
      video.onloadedmetadata = () => {
        video.play();
      };
      
      shareScreenStream.getVideoTracks()[0].addEventListener('ended', toggleScreenShare);
      
      return () => {
        shareScreenStream.getVideoTracks()[0].removeEventListener('ended', toggleScreenShare);
      }
    }
  }, [shareScreen, shareScreenStream, toggleScreenShare]);

  useEffect(() => {
    let TOTAL_ITEMS = shareScreen ? 2 : 1;
    const screenWidth = window.innerWidth;

    if((pinned || shareScreen) && screenWidth >= 768){
      TOTAL_ITEMS += 3;
    }

    Array.from(remoteUsers.values()).map(user => {
      TOTAL_ITEMS++;
      if(user.screen){
        TOTAL_ITEMS++;
      }
    });

    const TOTAL_PAGES = Math.ceil(TOTAL_ITEMS / itemsPerPage);
    if(currentPage >= TOTAL_PAGES && TOTAL_PAGES > 0){
      setCurrentPage(TOTAL_PAGES - 1);
    }
    setTotalPages(TOTAL_PAGES);
  },[pinned, shareScreen, itemsPerPage, remoteUsers]);

  const toggleAudio = () => {
    if(!audioTrack){
      return;
    }

    if(socket){
      if(isMicOn){
        socket.send(JSON.stringify({
          type: 'producerPaused',
          payload: {
            roomId: meetId,
            type: 'audio'
          }
        }));
        producers.audioProducer?.pause();
      }
      else{
        socket.send(JSON.stringify({
          type: 'producerResumed',
          payload: {
            roomId: meetId,
            type: 'audio'
          }
        }));
        producers.audioProducer?.resume();
      }
    }
    // eslint-disable-next-line
    audioTrack.enabled = !isMicOn;
    setIsMicOn(curr => !curr);
  }

  const toggleVideo = async () => {
    if(isCameraOn){
      if(socket){
        socket.send(JSON.stringify({
          type: 'producerClosed',
          payload: {
            roomId: meetId,
            type: 'video'
          }
        }));
      }

      if(videoTrack){
        videoTrack.stop();
      }
      
      producers.videoProducer?.close();
      setProducers(prev => {
        prev.videoProducer = null;
        return prev;
      });
      setVideoTrack(undefined);
    }
    else{
      const stream = await navigator.mediaDevices.getUserMedia({video: true});
      const newTrack = stream.getVideoTracks()[0];
      
      if(producerTransport){
        const videoProducer = await producerTransport.produce({
          track: newTrack,
          appData: { type: 'video', roomId: meetId }
        });
        
        setProducers(prev => {
          prev.videoProducer = videoProducer;
          return prev;
        });
      }

      setVideoTrack(newTrack);
    }

    setIsCameraOn(curr => !curr);
  }

  const leaveRoom = () => {
    if(!socket){
      return;
    }

    socket.send(JSON.stringify({
      type: 'leave-room',
      payload: {
        roomId: meetId
      }
    }));
    router.push('/');
  }

  const handlePinned = (userId: string, type: 'video' | 'screen') => {
    if(shareScreen){
      return;
    }

    if(pinned?.userId === userId && pinned.type === type){
      setPinned(null);
    }
    else{
      setPinned({userId, type});
      setCurrentPage(0);
    }
  }

  const pinnedItem = () => {
    if(!pinned) return null;

    if(pinned.userId === '1'){
      return(
        <UserCard 
          key='pinnedLocalUser'
          userId='1'
          firstName='You'
          lastName='(You)'
          isMicOn={isMicOn}
          videoStream={videoTrack && new MediaStream([videoTrack])}
          handlePinned={handlePinned}
        />
      )
    }

    const pinnedUser = remoteUsers.get(pinned?.userId);
    if(!pinnedUser){
      return null;
    }
    
    if(pinned?.type === 'screen' && pinnedUser.screen){
      return (
        <ScreenCard 
          key={pinnedUser.id}
          userId={pinnedUser.id}
          firstName={pinnedUser.firstName}
          lastName={pinnedUser.lastName}
          screenStream={pinnedUser.screen.stream}
          handlePinned={handlePinned}
        />
      )
    }

    return (
      <UserCard 
        key={pinnedUser.id}
        userId={pinnedUser.id}
        firstName={pinnedUser.firstName}
        lastName={pinnedUser.lastName}
        isMicOn={!pinnedUser.audio?.isPaused}
        videoStream={pinnedUser.video?.stream}
        handlePinned={handlePinned}
      />
    )
  }

  const pinnedSlots = useMemo(() => {
    if (!pinned && !shareScreen) return 0;
    return itemsPerPage >= 4 ? 4 : 1; 
  }, [pinned, shareScreen, itemsPerPage]);

  const allGridItems = useMemo(() => {
    const items: {userId: string; type: 'screen' | 'video'}[] = [];

    if (pinned?.userId !== '1') {
      items.push({ userId: '1', type: 'video' });
    }

    Array.from(remoteUsers.values())
      .filter((user) => user.screen)
      .forEach((user) => {
        if (pinned?.userId !== user.id || pinned?.type !== 'screen') {
          items.push({ userId: user.id, type: 'screen' });
        }
      });

    Array.from(remoteUsers.values()).forEach((user) => {
      if (pinned?.userId !== user.id || pinned?.type !== 'video') {
        items.push({ userId: user.id, type: 'video' });
      }
    });

    return items;
  }, [pinned, remoteUsers]);

  return (
    <>
      <main>
        {/* Audio */}
        <div className='hidden'>
          {
            Array.from(remoteUsers.values())
            .map(user => {
              if(user.audio && !user.audio?.isPaused){
                return <AudioPlayer key={`audio-${user.id}`} audioStream={user.audio.stream} />
              }
            })
          }
        </div>

        <div className="w-full h-screen flex flex-col overflow-hidden">
          <div className="flex-1 flex px-5 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Pinned */}
              {
                currentPage === 0 && (pinned !== null || shareScreen) &&
                <div className='col-span-2 xl:row-span-2 aspect-video bg-gray-100'>
                  {
                    shareScreen ?
                    <div className='w-full aspect-video'>
                      <video 
                        className="w-full aspect-video object-cover rounded"
                        ref={sharedScreenRef}
                        autoPlay
                        muted
                      />
                    </div>
                    :
                    pinnedItem()
                  }
                </div>
              }

              {
                allGridItems.slice(Math.max(0, currentPage * itemsPerPage - pinnedSlots), Math.max(0, (currentPage + 1) * itemsPerPage - pinnedSlots)).map(item => {
                  if(item.userId === '1'){
                    return (
                      <UserCard
                        key={`localUser`}
                        userId='1'
                        firstName={'You'}
                        lastName={'(You)'}
                        isMicOn={isMicOn}
                        videoStream={videoTrack && new MediaStream([videoTrack])}
                        handlePinned={handlePinned}
                      />
                    )
                  }

                  const user = remoteUsers.get(item.userId);
                  if(user && item.type === 'screen'){
                    return (
                      <ScreenCard 
                        key={`screen-${user.id}`}
                        userId={user.id}
                        firstName={user.firstName}
                        lastName={user.lastName}
                        screenStream={user.screen?.stream}
                        handlePinned={handlePinned}
                      />
                    )
                  }

                  if(user && item.type === 'video'){
                    return (
                      <UserCard 
                        key={`video-${user.id}`}
                        userId={user.id}
                        firstName={user.firstName}
                        lastName={user.lastName}
                        isMicOn={user.audio?.isPaused}
                        videoStream={user.video?.stream}
                        handlePinned={handlePinned}
                      />
                    )
                  }

                  return null
                })
              }
            </div>
          </div>

          {/* Pagination */}
          <div className='h-3 flex justify-center gap-2'>
            {
              Array.from({length: totalPages}).map((item, idx) => {
                return (
                  <div 
                    key={idx} 
                    className={`h-3 w-3 ${currentPage === idx && 'bg-gray-300'} border cursor-pointer`}
                    onClick={() => {setCurrentPage(idx)}}
                  >
                  </div>
                )
              })
            }
          </div>

          {/* Buttons */}
          <div className="p-2 w-full flex justify-center">
            <div className='p-3 flex justify-center items-center gap-6 border border-gray-100 shadow-md rounded'>
              <div 
                className={`h-10 w-10 flex items-center justify-center text-white rounded-full border-2 hover:opacity-70 ${isMicOn ? 'bg-black': "bg-red-500"}`}
                onClick={toggleAudio}  
              >
                {
                  isMicOn ?
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic-icon lucide-mic"><path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/></svg>
                  :
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic-off-icon lucide-mic-off"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                }
              </div>
              <div 
                className={`h-10 w-10 flex items-center justify-center text-white rounded-full border-2 hover:opacity-70 ${isCameraOn ? 'bg-black': "bg-red-500"}`}
                onClick={toggleVideo}   
              >
                {
                  isCameraOn ?
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-video-icon lucide-video"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>
                  :
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-video-off-icon lucide-video-off"><path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196"/><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"/><path d="m2 2 20 20"/></svg>
                }
              </div>
              <div 
                className={`h-10 w-10 flex items-center justify-center rounded-full border shadow-md hover:opacity-70 ${shareScreen ? 'bg-black text-white' : ''}`}
                onClick={toggleScreenShare} 
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-monitor-up-icon lucide-monitor-up"><path d="m9 10 3-3 3 3"/><path d="M12 13V7"/><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M12 17v4"/><path d="M8 21h8"/></svg>
              </div>
              <div 
                className={`h-10 w-10 flex items-center justify-center rounded-full border shadow-md hover:opacity-70 ${showParticipants ? 'bg-black text-white' : ''}`}
                onClick={() => {
                  setShowMessages(false);
                  setShowParticipants(curr => !curr)
                }} 
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users-round-icon lucide-users-round"><path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/></svg>
              </div>
              <div 
                className={`h-10 w-10 flex items-center justify-center rounded-full border shadow-md hover:opacity-70 ${showMessages ? 'bg-black text-white' : ''}`}
                onClick={() => {
                  setShowParticipants(false);
                  setShowMessages(curr => !curr);
                }} 
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square-icon lucide-message-square"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div 
                className="h-10 w-10 flex items-center justify-center bg-red-500 text-white rounded-full hover:opacity-70 transform rotate-z-135"
                onClick={leaveRoom}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-phone-icon lucide-phone"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg>
              </div>
            </div>
          </div>
        </div>
      </main>
      {
        showParticipants && 
        <Participants 
          remoteUsers={remoteUsers} 
          onClose={() => {setShowParticipants(false)}} 
        />
      }
      {
        showMessages && 
        <Chats 
          meetId={meetId as string} 
          chatMessages={chatMessages}
          setChatMessages={setChatMessages} 
          onClose={() => {setShowMessages(false)}}
        />
      }
    </>
  )
}