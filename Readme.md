# Installing Ionic

To install ionic, you should first have `npm` installed. Then, run:

```
sudo npm install -g cordova
sudo npm install -g ionic
```

# Setting up the project
To restore the project, first run `ionic state restore`.

Then, run `bower install`. Note that this means you need `bower` installed.

To run the project in the browser, run `ionic serve`.

To deploy directly to a connected Android device, run `ionic run android`.

To build an .apk, run `cordova build --release android`, then sign and zipalign the resulting apk.

For more information, visit the Ionic website for Ionic 1.3.*.
