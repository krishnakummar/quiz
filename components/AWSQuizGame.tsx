// Legacy AWS Quiz Game component - no longer used
// This component has been replaced by TestInterface with multi-tenant support
// Keeping as placeholder to avoid import errors

import React from 'react';

export function AWSQuizGame() {
  // Legacy component - no longer used
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-muted-foreground mb-2">Legacy Component</h2>
        <p className="text-muted-foreground">This component has been replaced by the multi-tenant TestInterface</p>
      </div>
    </div>
  );
}