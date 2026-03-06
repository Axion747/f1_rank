import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import { createClient } from '@supabase/supabase-js';

const html = htm.bind(React.createElement);

const SUPABASE_URL =
  window.__F1_RANK_CONFIG__?.supabaseUrl ||
  'https://uuygkrlkmgjoxgmvzxmj.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  window.__F1_RANK_CONFIG__?.supabasePublishableKey ||
  'sb_publishable_b7BH7vMDILpV7xOppEJRrQ_2E-45ojh';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export {
  React,
  createContext,
  createPortal,
  createRoot,
  html,
  supabase,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
};
