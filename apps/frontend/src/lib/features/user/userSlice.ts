import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface UserState {
  profile: UserProfile | null
}

const initialState: UserState = {
  profile: null
}

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserProfile: (state, action) => {
      state.profile = action.payload;
    }
  }
})

export const { setUserProfile } = userSlice.actions

export default userSlice.reducer