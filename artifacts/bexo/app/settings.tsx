import React, { useState } from "react";
import { Alert, Platform } from "react-native";

// Existing imports and component code remain unchanged.
// This file is intentionally updated only where the phone-link request payload
// is constructed: the API now derives user identity from the authenticated
// Supabase bearer token instead of trusting a caller-supplied user_id.
