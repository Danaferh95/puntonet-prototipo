package com.puntonet.configurador;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin propio (no viene de npm): hay que registrarlo antes de que arranque el bridge.
        registerPlugin(GuardarArchivoPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
