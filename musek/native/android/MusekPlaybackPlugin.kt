package com.musek.app.playback

import android.content.ComponentName
import android.net.Uri
import androidx.core.content.ContextCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.common.util.concurrent.ListenableFuture
import org.json.JSONObject

@CapacitorPlugin(name = "MusekNativePlayback")
class MusekPlaybackPlugin : Plugin() {
    private var controllerFuture: ListenableFuture<MediaController>? = null
    private var controller: MediaController? = null
    private var playerListener: Player.Listener? = null

    override fun load() {
        super.load()
        val token = SessionToken(context, ComponentName(context, MusekPlaybackService::class.java))
        val future = MediaController.Builder(context, token).buildAsync()
        controllerFuture = future
        future.addListener({
            try {
                controller = future.get()
                val listener = object : Player.Listener {
                    override fun onIsPlayingChanged(isPlaying: Boolean) = emitState()
                    override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) = emitState()
                    override fun onPlaybackStateChanged(playbackState: Int) = emitState()
                    override fun onPositionDiscontinuity(
                        oldPosition: Player.PositionInfo,
                        newPosition: Player.PositionInfo,
                        reason: Int
                    ) = emitState()
                }
                playerListener = listener
                controller?.addListener(listener)
                emitState()
            } catch (error: Exception) {
                notifyListeners("playbackError", JSObject().put("message", error.message ?: "Native player unavailable"))
            }
        }, ContextCompat.getMainExecutor(context))
    }

    @PluginMethod
    fun play(call: PluginCall) {
        withController(call) { active ->
            val queue = call.getArray("queue") ?: JSArray()
            val items = ArrayList<MediaItem>()
            var selectedIndex = 0
            for (index in 0 until queue.length()) {
                val song = queue.getJSONObject(index)
                val url = song.optString("audioUrl")
                if (url.isBlank() || url == "null") continue
                val metadata = MediaMetadata.Builder()
                    .setTitle(song.optString("title", "MUSEK"))
                    .setArtist(song.optString("artistName", ""))
                    .setArtworkUri(song.optString("artworkUrl").takeIf { it.isNotBlank() && it != "null" }?.let(Uri::parse))
                    .setMediaType(MediaMetadata.MEDIA_TYPE_MUSIC)
                    .build()
                val item = MediaItem.Builder()
                    .setMediaId(song.optString("id", url))
                    .setUri(url)
                    .setMediaMetadata(metadata)
                    .build()
                if (song.optString("id") == call.getString("songId")) selectedIndex = items.size
                items.add(item)
            }
            if (items.isEmpty()) throw IllegalArgumentException("No playable audio tracks were supplied.")
            active.setMediaItems(items, selectedIndex, 0L)
            active.repeatMode = Player.REPEAT_MODE_ALL
            active.prepare()
            active.play()
        }
    }

    @PluginMethod
    fun pause(call: PluginCall) {
        withController(call) { it.pause() }
    }

    @PluginMethod
    fun resume(call: PluginCall) {
        withController(call) { it.play() }
    }

    @PluginMethod
    fun seek(call: PluginCall) {
        val seconds = call.getDouble("seconds") ?: 0.0
        withController(call) { it.seekTo((seconds * 1000).toLong()) }
    }

    @PluginMethod
    fun getState(call: PluginCall) {
        val player = controller
        val item = player?.currentMediaItem
        val state = JSObject()
            .put("isPlaying", player?.isPlaying ?: false)
            .put("currentTime", (player?.currentPosition ?: 0L) / 1000.0)
            .put("duration", ((player?.duration ?: 0L).takeIf { it > 0L } ?: 0L) / 1000.0)
            .put("songId", item?.mediaId ?: "")
        call.resolve(state)
    }

    private fun withController(call: PluginCall, action: (MediaController) -> Unit) {
        val future = controllerFuture
        if (future == null) {
            call.reject("Native playback service is not available.")
            return
        }
        future.addListener({
            try {
                action(future.get())
                call.resolve()
            } catch (error: Exception) {
                call.reject("Native playback command failed.", error)
            }
        }, ContextCompat.getMainExecutor(context))
    }

    private fun emitState() {
        val player = controller ?: return
        notifyListeners(
            "playbackState",
            JSObject()
                .put("isPlaying", player.isPlaying)
                .put("currentTime", player.currentPosition / 1000.0)
                .put("duration", ((player.duration).takeIf { it > 0L } ?: 0L) / 1000.0)
                .put("songId", player.currentMediaItem?.mediaId ?: "")
        )
    }

    override fun handleOnDestroy() {
        playerListener?.let { controller?.removeListener(it) }
        controllerFuture?.let { MediaController.releaseFuture(it) }
        controller = null
        super.handleOnDestroy()
    }
}
