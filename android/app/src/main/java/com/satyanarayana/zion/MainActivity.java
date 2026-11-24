package com.satyanarayana.zion;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ZionWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
