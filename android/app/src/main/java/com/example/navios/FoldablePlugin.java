package com.example.navios;

import android.graphics.Rect;
import androidx.core.util.Consumer;
import androidx.window.java.layout.WindowInfoTrackerCallbackAdapter;
import androidx.window.layout.DisplayFeature;
import androidx.window.layout.FoldingFeature;
import androidx.window.layout.WindowInfoTracker;
import androidx.window.layout.WindowLayoutInfo;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

@CapacitorPlugin(name = "FoldablePlugin")
public class FoldablePlugin extends Plugin implements Consumer<WindowLayoutInfo> {

    private WindowInfoTrackerCallbackAdapter windowInfoTrackerAdapter;

    @Override
    public void load() {
        super.load();
        try {
            WindowInfoTracker tracker = WindowInfoTracker.getOrCreate(getActivity());
            windowInfoTrackerAdapter = new WindowInfoTrackerCallbackAdapter(tracker);
            Executor executor = getActivity().getMainExecutor();
            windowInfoTrackerAdapter.addWindowLayoutInfoListener(getActivity(), executor, this);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private JSObject lastFoldState = null;

    @Override
    public void accept(WindowLayoutInfo windowLayoutInfo) {
        boolean isTabletop = false;
        String stateStr = "FLAT";
        String orientationStr = "UNKNOWN";
        JSObject boundsObj = new JSObject();

        for (DisplayFeature feature : windowLayoutInfo.getDisplayFeatures()) {
            if (feature instanceof FoldingFeature) {
                FoldingFeature fold = (FoldingFeature) feature;
                FoldingFeature.State state = fold.getState();
                FoldingFeature.Orientation orientation = fold.getOrientation();

                stateStr = state == FoldingFeature.State.HALF_OPENED ? "HALF_OPENED" : "FLAT";
                orientationStr = orientation == FoldingFeature.Orientation.HORIZONTAL ? "HORIZONTAL" : "VERTICAL";

                Rect bounds = fold.getBounds();
                boundsObj.put("top", bounds.top);
                boundsObj.put("bottom", bounds.bottom);
                boundsObj.put("left", bounds.left);
                boundsObj.put("right", bounds.right);

                // Tabletop posture: device is half opened with hinge positioned horizontally across the display
                if (state == FoldingFeature.State.HALF_OPENED && orientation == FoldingFeature.Orientation.HORIZONTAL) {
                    isTabletop = true;
                }
            }
        }

        JSObject ret = new JSObject();
        ret.put("isTabletop", isTabletop);
        ret.put("state", stateStr);
        ret.put("orientation", orientationStr);
        ret.put("bounds", boundsObj);

        lastFoldState = ret;
        notifyListeners("onFoldStateChange", ret);
    }

    @PluginMethod
    public void getFoldState(PluginCall call) {
        if (lastFoldState != null) {
            call.resolve(lastFoldState);
        } else {
            JSObject ret = new JSObject();
            ret.put("isTabletop", false);
            ret.put("state", "FLAT");
            ret.put("orientation", "UNKNOWN");
            ret.put("bounds", null);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void getCurrentState(PluginCall call) {
        getFoldState(call);
    }
}
