import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set) => ({
      tipoCambio: 6.96, // Valor por defecto en Bolivia
      setTipoCambio: (nuevoTC) => set({ tipoCambio: nuevoTC }),
    }),
    {
      name: 'ipcb-settings-storage', // Guarda el tipo de cambio en localStorage
    }
  )
);
