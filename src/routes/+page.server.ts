import { db } from '$lib/firebase';
import { ref, get } from 'firebase/database';
import type { Load } from '@sveltejs/kit';

export const load: Load = async () => {
  
  const dataRef = ref(db, 'posts');
  const snapshot = await get(dataRef);
  const data = snapshot.val();
  
  if (data) {
    return {
      
        data
      
    };
  } else {
    return {
      status: 500,
      error: new Error('Could not load data')
    };
  }
};
