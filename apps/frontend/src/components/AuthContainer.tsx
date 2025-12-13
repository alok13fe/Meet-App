import { useState } from "react"
import Signin from "./Signin";
import Signup from "./Signup";

interface AuthContainerProps {
  route: string;
  onClose: () => void;
}

export default function AuthContainer({ route, onClose }: AuthContainerProps){
  const [page, setPage] = useState(route);
  
  return(
    <div className="glass-card fixed inset-0 z-20 bg-[rgba(230,228,228,0.15)] backdrop-blur-[3px] flex items-center justify-center pointer-events-auto">
      {
        page === 'signup' ?
        <Signup setPage={setPage} onClose={onClose} />
        :
        <Signin setPage={setPage} onClose={onClose}/>
      }
    </div>
  )
}