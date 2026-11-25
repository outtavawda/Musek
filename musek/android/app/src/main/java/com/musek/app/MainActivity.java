package com.musek.app;

import com.musek.app.playback.MusekPlaybackPlugin;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(MusekPlaybackPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
