# Setup

## Prerequisites

Make sure you have `node v16` installed.

## Extracting

Extract to your desired location and cd into the installation directory:

```bash
unzip smtp-email-aggregator-relay-1.0.0.zip
cd smtp-email-aggregator-relay-1.0.0
```

## Install

Run:


```bash
npm install
```

## Configure

Using your favourite text editor, edit the `config.yaml` file (it is well documented in the in-file comments).

## Run Relay Test

Run:

```bash
npm run test-relay
```

Once you see the `server listening` confirmation message, try sending a bogus email from the CWA to this running script. If it is received, you will see an INCOMING MESSAGE on the console with a breakdown of the message. 

The script will next try to forward the received message on to the configured postfix server. If it works, you will see a SUCCESS message, if it fails you will see an ERROR message and a reason for the failure. If it says SUCCESS, make sure the postfix server has indeed received it and the email shows up in your gmail sent folder.

The script will keep running and receive/forward as many messages as you send it, just Ctrl+C to end it.

If it all works out, the script is configured and ready. If you make any changed to the `config.yaml` while running the script, you have to of course end it and re-run for the changes to take effect.

## Setting up as daemon

I'm assuming you're installing the script on linux and that the distro uses systemd. Quick check to make sure it does:

```bash
systemctl
```

If this shows a long list of services, then we have systemd, hit Ctrl+C to exit the list.

If you don't have systemd, let me know what distro and version you are using and I'll write you a new set of instructions.

### Edit service file

Using your favourite text editor, edit the `smtp_email_aggregator_relay.service` file.

* Edit the `ExecStart` value and replace `/path/to/installation` with an absolute path to your installation directory (meaning the extracted `smtp-email-aggregator-relay-1.0.0` directory).
* On the command line, run `dirname "$(which node)"`. Check the `Environment=PATH` value in the service file and make sure it includes the directory that was outputted by the previous command.
* Edit the `WorkingDirectory` value and replace `/path/to/installation` with an absolute path to your installation directory.
* The `User` and `Group` values are both set to `root`. You can change this to another user/group if you prefer, but that user **must have** write permissions to the installation directory.

### Install, start and enable service

Run the following command from inside the installation directory to copy the service file to the appropriate systemd location:

```bash
sudo cp smtp_email_aggregator_relay.service /etc/systemd/system/
```

Now you can start the service:

```bash
systemctl start smtp_email_aggregator_relay
```

And finally enable the service so it will automatically run on system boot.

```bash
systemctl enable smtp_email_aggregator_relay
```

**Note**: you will probably be prompted for your root password when you run the commands above.

### Check that the service is running

To see the logs of the running service run:

```bash
journalctl -u smtp_email_aggregator_relay
```

If the service has started successfully, the last two lines of the log should something look like (with the ports you have configured):

```
incoming smtp server listening on 0.0.0.0:5025
live test server listening on 0.0.0.0:5050
```

Hit Ctrl+C to exit this list.

Additionally, in the installation directory you can run:

```bash
npm run tail-debug
```

This should be moving continuously with debug messages, if the command ends with an error, or shows nothing, or is not moving, then the service is not running properly.

And finally you can always open the live test server you configured in the `config.yaml` file in your browser. At a URL such as (with the port you configured):

```
http://localhost:5050
```

If you see "OK" only on the page, then service is running.

## Conclusion

If all this works, the script is good to go - start running some real but bogus tests, with emails that you expect to be forwarded on, and emails that should be aggregated, as well aggregatable emails that are allowed to fall out of the waiting window - to see if they are forwarded as they are.










