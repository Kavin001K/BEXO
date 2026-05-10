/**
 * WebCrypto polyfill for React Native using expo-crypto.
 *
 * Must be imported BEFORE @supabase/supabase-js so that the Supabase
 * GoTrue client sees crypto.subtle.digest and uses SHA-256 PKCE
 * instead of falling back to "plain" (which GoTrue rejects with 500).
 */
import { Platform } from "react-native";
import * as ExpoCrypto from "expo-crypto";

if (Platform.OS !== "web") {
  // Ensure crypto exists on all global objects
  if (typeof global.crypto === "undefined") {
    (global as any).crypto = {} as Crypto;
  }
  if (typeof globalThis.crypto === "undefined") {
    (globalThis as any).crypto = global.crypto;
  }
  if (typeof window !== "undefined" && typeof window.crypto === "undefined") {
    (window as any).crypto = global.crypto;
  }

  const globalCrypto = global.crypto as any;

  // Polyfill getRandomValues
  if (typeof globalCrypto.getRandomValues === "undefined") {
    globalCrypto.getRandomValues = ExpoCrypto.getRandomValues;
  }

  // Polyfill subtle.digest (critical for PKCE SHA-256)
  if (typeof globalCrypto.subtle === "undefined") {
    globalCrypto.subtle = {
      digest: async (
        algorithm: string,
        data: ArrayBuffer | Uint8Array
      ): Promise<ArrayBuffer> => {
        const algoMap: Record<string, ExpoCrypto.CryptoDigestAlgorithm> = {
          "SHA-256": ExpoCrypto.CryptoDigestAlgorithm.SHA256,
          "SHA-384": ExpoCrypto.CryptoDigestAlgorithm.SHA384,
          "SHA-512": ExpoCrypto.CryptoDigestAlgorithm.SHA512,
        };
        const mapped =
          algoMap[algorithm] ?? ExpoCrypto.CryptoDigestAlgorithm.SHA256;
        const inputBytes =
          data instanceof Uint8Array ? data : new Uint8Array(data);
        
        // Manual hex conversion to avoid 'Buffer' dependency on native
        const hex = Array.from(inputBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        const digestHex = await ExpoCrypto.digestStringAsync(mapped, hex, {
          encoding: ExpoCrypto.CryptoEncoding.HEX
        });
        
        const bytes = new Uint8Array(digestHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        return bytes.buffer as ArrayBuffer;
      },
    };
  }
}
