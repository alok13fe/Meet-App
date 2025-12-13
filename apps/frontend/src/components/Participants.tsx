import { useAppSelector } from '../lib/hooks'
import { IRemoteUser } from './MeetPreview';

interface IParticipants {
  remoteUsers: Map<string, IRemoteUser>;
  onClose: () => void;
}

export default function Participants({remoteUsers, onClose}: IParticipants) {

  const { profile } = useAppSelector(state => state.user);
  
  return (
    <div className='fixed top-0 right-0 z-10 p-2 rounded'>
      <div className="w-80 h-[calc(100vh-16px)] flex flex-col p-4 bg-white border border-gray-500 rounded">
        <div className='flex justify-between'>
          <h3 className="font-semibold mb-4">Participants ({remoteUsers.size + 1})</h3>
          <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" onClick={onClose}>
          <path fillRule="evenodd" clipRule="evenodd" d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z" fill="#000000"/>
          </svg>
        </div>
        <div className="space-y-2 overflow-y-auto">
          <div className="p-3 space-x-3 flex items-center bg-gray-100">
            <span className="w-8 h-8 flex items-center justify-center bg-gray-200 capitalize rounded-full">{profile?.firstName[0]}</span>
            <div className="flex-1">
              <p className="text-sm font-medium capitalize">{profile?.firstName} {profile?.lastName}</p>
              <p className="text-xs text-muted-foreground">You</p>
            </div>
            <div className="flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic-off-icon lucide-mic-off"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </div>
          </div>
          {
            Array.from(remoteUsers.values()).map((user, idx) => {
              return (
                <div key={idx} className={`p-3 space-x-3 flex items-center ${idx%2 !== 0 && 'bg-gray-100'}`}>
                  <span className="w-8 h-8 bg-gray-200 flex items-center justify-center capitalize rounded-full">{user.firstName[0]}</span>
                  <div className="flex-1">
                    <p className="text-sm capitalize font-medium">{ user.firstName } { user.lastName }</p>
                  </div>
                  <div className="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic-off-icon lucide-mic-off"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                  </div>
                </div>
              )
            })
          }
        </div>
      </div>
    </div>
  )
}


