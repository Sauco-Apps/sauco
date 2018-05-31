#!/usr/bin/env bash
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
export LANGUAGE=en_US.UTF-8
version="1.2.2"

cd "$(cd -P -- "$(dirname -- "$0")" && pwd -P)"
root_path=$(pwd)

mkdir -p $root_path/logs
logfile=$root_path/logs/sauco_manager.log
ipfs_log=$root_path/logs/ipfs.log

SCRIPT_NAME="saucoPool"

cd "$(cd -P -- "$(dirname -- "$0")" && pwd -P)"
. "$(pwd)/shared.sh"
. "$(pwd)/env.sh"

if [ ! -f "$(pwd)/dpospool.js" ]; then
  echo "Error: $SCRIPT_NAME installation was not found. Exiting."
  exit 1
fi

if [ "\$USER" == "root" ]; then
  echo "Error: $SCRIPT_NAME should not be run be as root. Exiting."
  exit 1
fi

UNAME=$(uname)
POOL_CONFIG=config.json

LOGS_DIR="$(pwd)/logs"
PIDS_DIR="$(pwd)/pids"

LOG_DB_FILE="$LOGS_DIR/pgsql.log"
LOG_APP_FILE="$LOGS_DIR/app.log"
LOG_CRON_FILE="$LOGS_DIR/cron.log"

PID_APP_FILE="$PIDS_DIR/dpospool.pid"
PID_DB_FILE="$PIDS_DIR/pgsql.pid"

DB_NAME="$(grep "dbname" "$POOL_CONFIG" | cut -f 4 -d '"')"
DB_USER="$(grep "dbuser" "$POOL_CONFIG" | cut -f 4 -d '"')"
DB_PASS="$(grep "dbpass" "$POOL_CONFIG" | cut -f 4 -d '"')"
DB_PORT="$(grep "dbport" "$POOL_CONFIG" | cut -f 4 -d '"')"
DB_DATA="$(pwd)/pgsql/data"
DB_CONFIG="$(pwd)/pgsql/pgsql.conf"

set_network() {
  if [ "$(grep "5e46ad3c1e48ab33832312370507a506634f77e61db452d9b70886e113412f38" $SHIFT_CONFIG )" ];then
    NETWORK="main"
  elif [ "$(grep "fa7869d9006e6dbc64ac96b44f4fea65833f9f2774dd8798bec4f9f2dc094099" $SHIFT_CONFIG )" ];then
    NETWORK="test"
  else
    NETWORK="unknown"
  fi
}

SHIFT_CONFIG="config.json"
DB_NAME="$(grep "database" $SHIFT_CONFIG | cut -f 4 -d '"' | head -1)"
DB_UNAME="$(grep "user" $SHIFT_CONFIG | cut -f 4 -d '"' | head -1)"
DB_PASSWD="$(grep "password" $SHIFT_CONFIG | cut -f 4 -d '"' | head -1)"
DB_SNAPSHOT="blockchain.db.gz"
NETWORK=""
set_network
BLOCKCHAIN_URL="https://downloads.sauco.io/snapshot/$NETWORK"
GIT_BRANCH="$(git branch | sed -n '/\* /s///p')"

install_prereq() {

    if [[ ! -f /usr/bin/sudo ]]; then
        echo "Install sudo before continuing. Issue: apt-get install sudo as root user."
        echo "Also make sure that your user has sudo access."
    fi

    sudo id &> /dev/null || { exit 1; };

    echo ""
    echo "-------------------------------------------------------"
    echo "Sauco installer script. Version: $version"
    echo "-------------------------------------------------------"
    
    echo -n "Running: apt-get update... ";
    sudo apt-get update  &> /dev/null || \
    { echo "Could not update apt repositories. Run apt-get update manually. Exiting." && exit 1; };
    echo -e "done.\n"

    echo -n "Running: apt-get install curl build-essential python lsb-release wget openssl autoconf libtool automake libsodium-dev jq dnsutils ... ";
    sudo apt-get install -y -qq curl build-essential python lsb-release wget openssl autoconf libtool automake libsodium-dev jq dnsutils &>> $logfile || \
    { echo "Could not install packages prerequisites. Exiting." && exit 1; };
    echo -e "done.\n"

#    echo -n "Removing former postgresql installation... ";
#    sudo apt-get purge -y -qq postgres* &>> $logfile || \
#    { echo "Could not remove former installation of postgresql. Exiting." && exit 1; };
#    echo -e "done.\n"

    echo -n "Updating apt repository sources for postgresql.. ";
    sudo bash -c 'echo "deb http://apt.postgresql.org/pub/repos/apt/ wheezy-pgdg main" > /etc/apt/sources.list.d/pgdg.list' &>> $logfile || \
    { echo "Could not add postgresql repo to apt." && exit 1; }
    echo -e "done.\n"

    echo -n "Adding postgresql repo key... "
    sudo wget -q https://www.postgresql.org/media/keys/ACCC4CF8.asc -O - | sudo apt-key add - &>> $logfile || \
    { echo "Could not add postgresql repo key. Exiting." && exit 1; }
    echo -e "done.\n"

    echo -n "Installing postgresql... "
    sudo apt-get update -qq &> /dev/null && sudo apt-get install -y -qq postgresql-9.6 postgresql-contrib-9.6 libpq-dev &>> $logfile || \
    { echo "Could not install postgresql. Exiting." && exit 1; }
    echo -e "done.\n"

    echo -n "Enable postgresql... "
        sudo update-rc.d postgresql enable
    echo -e "done.\n"

    return 0;
}

ntp_checks() {
    # Install NTP or Chrony for Time Management - Physical Machines only
    if [[ ! -f "/proc/user_beancounters" ]]; then
      if ! sudo pgrep -x "ntpd" > /dev/null; then
        echo -n "Installing NTP... "
        sudo apt-get install ntp -yyq &>> $logfile
        sudo service ntp stop &>> $logfile
        sudo ntpdate pool.ntp.org &>> $logfile
        sudo service ntp start &>> $logfile
        if ! sudo pgrep -x "ntpd" > /dev/null; then
          echo -e "SAUCO requires NTP running. Please check /etc/ntp.conf and correct any issues. Exiting."
          exit 1
        echo -e "done.\n"
        fi # if sudo pgrep
      fi # if [[ ! -f "/proc/user_beancounters" ]]
    elif [[ -f "/proc/user_beancounters" ]]; then
      echo -e "Running OpenVZ or LXC VM, NTP is not required, done. \n"
    fi
}

create_database() {
    res=$(sudo -u postgres dropdb --if-exists "$DB_NAME" 2> /dev/null)
    res=$(sudo -u postgres createdb -O "$DB_UNAME" "$DB_NAME" 2> /dev/null)
    res=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_database where datname='$DB_NAME'" 2> /dev/null)
    
    if [[ $res -eq 1 ]]; then
      echo "√ Postgresql database created successfully."
    else
      echo "X Failed to create Postgresql database."
      exit 1
    fi
}

download_blockchain() {
    echo -n "Download a recent, verified snapshot? ([y]/n): "
    read downloadornot

    if [ "$downloadornot" == "y" ] || [ -z "$downloadornot" ]; then
        rm -f $DB_SNAPSHOT
        if [ -z "$BLOCKCHAIN_URL" ]; then
            BLOCKCHAIN_URL="https://downloads.sauco.io/snapshot/$NETWORK"
        fi
        echo "√ Downloading $DB_SNAPSHOT from $BLOCKCHAIN_URL"
        curl --progress-bar -o $DB_SNAPSHOT "$BLOCKCHAIN_URL/$DB_SNAPSHOT"
        if [ $? != 0 ]; then
            rm -f $DB_SNAPSHOT
            echo "X Failed to download blockchain snapshot."
            exit 1
        else
            echo "√ Blockchain snapshot downloaded successfully."
        fi
    else
        echo -e "√ Using Local Snapshot."
    fi
}

restore_blockchain() {
    export PGPASSWORD=$DB_PASSWD
    echo "Restoring blockchain with $DB_SNAPSHOT"
    gunzip -fcq "$DB_SNAPSHOT" | psql -q -h 127.0.0.1 -U "$DB_UNAME" -d "$DB_NAME" &> /dev/null
    if [ $? != 0 ]; then
        echo "X Failed to restore blockchain."
        exit 1
    else
        echo "√ Blockchain restored successfully."
    fi
}

add_pg_user_database() {

    if start_postgres; then
        user_exists=$(grep postgres /etc/passwd |wc -l);
        if [[ $user_exists == 1 ]]; then
            res=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_UNAME'" 2> /dev/null)
            if [[ $res -ne 1 ]]; then
              echo -n "Creating database user... "
              res=$(sudo -u postgres psql -c "CREATE USER $DB_UNAME WITH PASSWORD '$DB_PASSWD';" 2> /dev/null)
              res=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_UNAME'" 2> /dev/null)
              if [[ $res -eq 1 ]]; then
                echo -e "done.\n"
              fi
            fi

            echo -n "Creating database... "
            res=$(sudo -u postgres dropdb --if-exists "$DB_NAME" 2> /dev/null)
            res=$(sudo -u postgres createdb -O "$DB_UNAME" "$DB_NAME" 2> /dev/null)
            res=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_database where datname='$DB_NAME'" 2> /dev/null)
            if [[ $res -eq 1 ]]; then
                echo -e "done.\n"
            fi
        fi
        return 0
    fi

    return 1;
}

start_postgres() {

    installed=$(dpkg -l |grep postgresql |grep ii |head -n1 |wc -l);
    running=$(ps aux |grep "bin\/postgres" |wc -l);

    if [[ $installed -ne 1 ]]; then
        echo "Postgres is not installed. Install postgres manually before continuing. Exiting."
        exit 1;
    fi

    if [[ $running -ne 1 ]]; then
        sudo /etc/init.d/postgresql start &>> $logfile || { echo -n "Could not start postgresql, try to start it manually. Exiting." && exit 1; }
    fi

    return 0
}

install_node_npm() {

    echo -n "Installing nodejs and npm... "
    curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash - &>> $logfile
    sudo apt-get install -y -qq nodejs &>> $logfile || { echo "Could not install nodejs and npm. Exiting." && exit 1; }
    sudo apt-get install npm &>> $logfile || { echo "Could not install npm. Exiting." && exit 1; }
    echo -e "done.\n" && echo -n "Installing grunt-cli... "
    sudo npm install grunt-cli -g &>> $logfile || { echo "Could not install grunt-cli. Exiting." && exit 1; }
    echo -e "done.\n" && echo -n "Installing bower... "
    sudo npm install bower -g &>> $logfile || { echo "Could not install bower. Exiting." && exit 1; }
    echo -e "done.\n" && echo -n "Installing process management software... "
    sudo npm install forever -g &>> $logfile || { echo "Could not install process management software(forever). Exiting." && exit 1; }
    echo -e "done.\n"

    return 0;
}

install_sauco() {

    echo -n "Installing Sauco core... "
    #npm install --production --unsafe-perm &>> $logfile || { echo "Could not install SAUCO, please check the log directory. Exiting." && exit 1; }
    npm install &>> $logfile || { echo "Could not install SAUCO, please check the log directory. Exiting." && exit 1; }
    echo -e "done.\n"

    return 0;
}

install_webui() {

    echo -n "Installing Sauco WebUi... "
    git clone https://github.com/Sauco-Apps/sauco-wallet &>> $logfile || { echo -n "Could not clone git wallet source. Exiting." && exit 1; }

    if [[ -d "public" ]]; then
        rm -rf public/
    fi

    if [[ -d "sauco-wallet" ]]; then
        mv sauco-wallet public
    else
        echo "Could not find installation directory for SAUCO web wallet. Install the web wallet manually."
        exit 1;
    fi

    cd public && npm install &>> $logfile || { echo -n "Could not install web wallet node modules. Exiting." && exit 1; }

    # Bower config seems to have the wrong permissions. Make sure we change these before trying to use bower.
    if [[ -d /home/$USER/.config ]]; then
        sudo chown -R $USER:$USER /home/$USER/.config &> /dev/null
    fi

    bower --allow-root install &>> $logfile || { echo -e "\n\nCould not install bower components for the web wallet. Exiting." && exit 1; }
    grunt release &>> $logfile || { echo -e "\n\nCould not build web wallet release. Exiting." && exit 1; }
    echo "done."

    cd ..
    
    return 0;

}


update_manager() {

    echo -n "Updating Sauco Manager ... "
    wget -q -O sauco_manager.bash https://raw.githubusercontent.com/Sauco-Apps/sauco/$GIT_BRANCH/sauco_manager.bash
    echo "done."

    return 0;
}


update_client() {

    if [[ -f config.json ]]; then
        cp config.json config.json.bak
    fi

    echo -n "Updating Sauco client ... "

    git checkout . &>> $logfile || { echo "Failed to checkout last status of git repository. Run it manually with: 'git checkout .'. Exiting." && exit 1; }
    git pull &>> $logfile || { echo "Failed to fetch updates from git repository. Run it manually with: git pull. Exiting." && exit 1; }
    npm install --production &>> $logfile || { echo -e "\n\nCould not install node modules. Exiting." && exit 1; }
    echo "done."

    if [[ -f $root_path/config.json.bak ]]; then
      echo -n "Take over config.json entries from previous installation ... "
      node $root_path/updateConfig.js -o $root_path/config.json.bak -n $root_path/config.json
      echo "done."
    fi

    return 0;
}

update_wallet() {

    if [[ ! -d "public" ]]; then
      install_webui
      return 0;
    fi

    echo -n "Updating Sauco wallet ... "

    cd public
    git checkout . &>> $logfile || { echo "Failed to checkout last status of git repository. Exiting." && exit 1; }
    git pull &>> $logfile || { echo "Failed to fetch updates from git repository. Exiting." && exit 1; }
    npm install &>> $logfile || { echo -n "Could not install web wallet node modules. Exiting." && exit 1; }

    # Bower config seems to have the wrong permissions. Make sure we change these before trying to use bower.
    if [[ -d /home/$USER/.config ]]; then
        sudo chown -R $USER:$USER /home/$USER/.config &> /dev/null
    fi

    bower --allow-root install &>> $logfile || { echo -e "\n\nCould not install bower components for the web wallet. Exiting." && exit 1; }
    grunt release &>> $logfile || { echo -e "\n\nCould not build web wallet release. Exiting." && exit 1; }

    echo "done."
    cd ..
    return 0;
}

stop_sauco() {
    echo -n "Stopping Sauco... "
    forever_exists=$(whereis forever | awk {'print $2'})
    if [[ ! -z $forever_exists ]]; then
        $forever_exists stop $root_path/app.js &>> $logfile
    fi

    sleep 2

    if ! running; then
        echo "OK"
        return 0
    fi
    echo
    return 1
}

start_sauco() {
    echo -n "Starting Sauco... "
    forever_exists=$(whereis forever | awk {'print $2'})
    if [[ ! -z $forever_exists ]]; then
        $forever_exists start -o $root_path/logs/sauco_console.log -e $root_path/logs/sauco_err.log app.js -c "$SHIFT_CONFIG" &>> $logfile || \
        { echo -e "\nCould not start Sauco." && exit 1; }
    fi

    sleep 2

    if running; then
        echo "OK"
        return 0
    fi
    echo
    return 1
}

  start_snapshot() {
    echo -n "Starting Sauco (snapshot mode) ... "
    forever_exists=$(whereis forever | awk {'print $2'})
    if [[ ! -z $forever_exists ]]; then
        $forever_exists start -o $root_path/logs/snapshot_console.log -e $root_path/logs/snapshot_err.log app.js -c "$SHIFT_CONFIG" -s highest &>> $logfile || \
        { echo -e "\nCould not start Sauco." && exit 1; }
    fi

    sleep 2

    if running; then
        echo "OK"
        return 0
    fi
    echo
    return 1
}

running() {
    process=$(forever list |grep app.js |awk {'print $9'})
    if [[ -z $process ]] || [[ "$process" == "STOPPED" ]]; then
        return 1
    fi
    return 0
}

show_blockHeight(){
  export PGPASSWORD=$DB_PASSWD
  blockHeight=$(psql -d $DB_NAME -U $DB_UNAME -h localhost -p 5432 -t -c "select height from blocks order by height desc limit 1")
  echo "Block height = $blockHeight"
}

parse_option() {
  OPTIND=2
  while getopts c:x opt; do
    case "$opt" in
      c)
        if [ -f "$OPTARG" ]; then
          SHIFT_CONFIG="$OPTARG"
        fi ;;
    esac
  done
}

rebuild_sauco() {
  create_database
}

install_ipfs() {
  sudo apt-get update  &> /dev/null;
  if [ ! -x "$(command -v jq)" ]; then
      echo -n "jq is not installed. Installing jq ... "
      sudo apt-get install -y -qq jq  &> /dev/null || { echo "Could not install jq. Exiting." && exit 1; };
      echo -e "done.\n"
  fi
  if [ ! -x "$(command -v dig)" ]; then
      echo -n "dig is not installed. Installing dnsutils ... "
      sudo apt-get install -y -qq dnsutils  &> /dev/null || { echo "Could not install dig. Exiting." && exit 1; };
      echo -e "done.\n"
  fi

  # Check if IPFS is already installed
  #ipfs_exists=$(whereis ipfs | awk {'print $2'})
  #  if [[ ! -z $ipfs_exists ]]; then
  #    echo -e "IPFS is already installed. Remove it first with ./sauco_manager.bash remove_ipfs"
  #    exit 1;
  #  fi

  # Move the binary to /usr/local/bin/
  if [ ! -f $root_path/bin/ipfs ]; then
      echo -e "\nIPFS binary not found!" && exit 1;
  else
      sudo cp $root_path/bin/ipfs /usr/local/bin/ipfs
  fi

  # IPFS initialise
  if [ ! -f /usr/local/bin/ipfs ]; then
      echo -e "\n/usr/local/bin/ipfs does not exist!" && exit 1;
  else
      sudo chmod 755 /usr/local/bin/ipfs
      ipfs init
  fi

  PORT="$(jq .port $SHIFT_CONFIG)"
  SPORT="$(jq .ssl.options.port $SHIFT_CONFIG)"

  # Check if ipfs config exists
  if [ ! -f ~/.ipfs/config ]; then
      echo -e "\nIPFS installation failed.." && exit 1;
  else
      echo -e "Pushing IPFS config..." && sleep 2;
      MYIP=$(dig +short myip.opendns.com @resolver1.opendns.com)
      ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin "[\"https://$MYIP:5001\",\"http://$MYIP:5001\",\"https://127.0.0.1:5001\",\"http://127.0.0.1:5001\",\"https://$MYIP:8080\",\"http://$MYIP:8080\",\"https://127.0.0.1:8080\",\"http://127.0.0.1:8080\",\"https://$MYIP:4001\",\"http://$MYIP:4001\",\"https://127.0.0.1:4001\",\"http://127.0.0.1:4001\"]"
      ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "GET", "POST"]'
      ipfs config --json API.HTTPHeaders.Access-Control-Allow-Credentials '["true"]'
      ipfs config --json Addresses.API '"/ip4/0.0.0.0/tcp/5001"'
      ipfs config --json Addresses.Gateway '"/ip4/0.0.0.0/tcp/8080"'
      #BOOTSTRAP=$(ipfs config Bootstrap)
      #BOOTSTRAP=$(echo $BOOTSTRAP | jq ' .+ ["/ip4/213.32.16.10/tcp/4001/ipfs/QmcWjSF6prpJwBZsfPSfzGEL61agU1vcMNCX8K6qaH5PAq"]')
      #ipfs config --json Bootstrap "$BOOTSTRAP"

      if [[ $(ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin) = *$MYIP* ]]; then
        echo -e "\nIPFS succesfully installed!";
      else
        echo -e "\nError pushing IPFS config!!" && exit 1;
      fi
  fi
}

remove_ipfs() {
  echo -e "Removing IPFS from your system.."

  if [[ -f /usr/local/bin/ipfs ]]; then
    if sudo rm /usr/local/bin/ipfs; then
      echo -e "Removed /usr/local/bin/ipfs"
    else
      echo -e "Unable to remove /usr/local/bin/ipfs"
    fi
  fi

  if [ -d "$HOME/.ipfs" ]; then
    if sudo rm -rf $HOME/.ipfs; then
      echo -e "Removed $HOME/.ipfs"
    else
      echo -e "Unable to remove $HOME/.ipfs"
    fi
  fi

  echo -e "Done."
}

start_ipfs() {
  echo -e "Starting IPFS daemon.."

  if ! sudo pgrep -x "ipfs" > /dev/null; then
    ipfs daemon > $ipfs_log 2>&1 &
    sleep 2
    if ! sudo pgrep -x "ipfs" > /dev/null; then
      echo -e "IPFS not started. Check the log file: $ipfs_log"
      exit 1;
    else
      echo -e "IPFS started!"
    fi
  else
    echo -e "IPFS already running.."
  fi
}

stop_ipfs() {
  echo -e "Stopping IPFS daemon.."

  if ! sudo pgrep -x "ipfs" > /dev/null; then
    echo -e "IPFS not running.."
    exit 1;
  else
    pgrep ipfs | xargs kill
    sleep 4

    if ! sudo pgrep -x "ipfs" > /dev/null; then
      echo -e "IPFS stopped!"
    else
      echo -e "IPFS still running.."
      exit 1;
    fi
  fi
}

check_ipfs() {
  echo -e "Checking if IPFS is running.."

  if ! sudo pgrep -x "ipfs" > /dev/null; then
    echo -e "IPFS not running.."
    exit 1;
  else
    echo -e "IPFS is runnning!"
  fi
}

start_log() {
  echo "Starting $0... " > $logfile
  echo -n "Date: " >> $logfile
  date >> $logfile
  echo "" >> $logfile
}

install_pool(){
  npm install gulp -g
  cd public_src
  bower --allow-root install
  npm install
  gulp release
  cd ..
  npm install

  autostart_pool
  start_pool
  echo " * Instalación de Sauco Pool Completa!"
}

autostart_pool() {
  local cmd="crontab"

  command -v "$cmd" &> /dev/null

  if [ $? != 0 ]; then
    echo "X Failed to execute crontab."
    return 1
  fi

  crontab=$($cmd -l 2> /dev/null | sed '/pool\.sh start/d' 2> /dev/null)

  crontab=$(cat <<-EOF
	$crontab
	@reboot $(command -v "bash") $(pwd)/pool.sh start > $LOG_CRON_FILE 2>&1
	EOF
  )

  printf "$crontab\n" | $cmd - &> /dev/null

  if [ $? != 0 ]; then
    echo "X Failed to update crontab."
    return 1
  else
    echo "√ Crontab updated successfully."
    return 0
  fi
}
check_pool() {
  if [ -f "$PID_APP_FILE" ]; then
    PID="$(cat "$PID_APP_FILE")"
  fi
  if [ ! -z "$PID" ]; then
    ps -p "$PID" > /dev/null 2>&1
    STATUS=$?
  else
    STATUS=1
  fi

  if [ -f $PID_APP_FILE ] && [ ! -z "$PID" ] && [ $STATUS == 0 ]; then
    echo "√ $SCRIPT_NAME is running as PID: $PID"
    return 0
  else
    echo "X $SCRIPT_NAME is not running."
    return 1
  fi
}
start_pool() {
  if check_pool == 1 &> /dev/null; then
    check_pool
    exit 1
  else
    forever start -u $SCRIPT_NAME -a -l $LOG_APP_FILE --pidFile $PID_APP_FILE -m 1 dpospool.js &> /dev/null
    if [ $? == 0 ]; then
      echo "√ $SCRIPT_NAME started successfully."
      sleep 3
      check_pool
    else
      echo "X Failed to start $SCRIPT_NAME."
    fi
  fi
}
stop_pool() {
  if check_pool != 1 &> /dev/null; then
    stopPool=0
    while [[ $stopPool < 5 ]] &> /dev/null; do
      forever stop -t $PID --killSignal=SIGTERM -l $LOG_APP_FILE &> /dev/null
      if [ $? !=  0 ]; then
        echo "X Failed to stop $SCRIPT_NAME."
      else
        echo "√ $SCRIPT_NAME stopped successfully."
        break
      fi
      sleep .5
      stopPool=$[$stopPool+1]
    done
  else
    echo "√ $SCRIPT_NAME is not running."
  fi
}
tail_logs() {
  if [ -f "$LOG_APP_FILE" ]; then
    tail -f "$LOG_APP_FILE"
  fi
}

case $1 in
    "install")
      start_log
      install_prereq
      ntp_checks
      add_pg_user_database
      install_node_npm
      install_sauco
      install_webui
      install_ipfs
      echo ""
      echo ""
      echo "SAUCO successfully installed"

    ;;
    "update_manager")
      update_manager
    ;;
    "update_client")
      start_log
      stop_sauco
      sleep 2
      update_client
      sleep 2
      start_sauco
      show_blockHeight
    ;;
    "update_wallet")
      start_log
      stop_sauco
      sleep 2
      update_wallet
      sleep 2
      start_sauco
      show_blockHeight
    ;;
    "install_ipfs")
      install_ipfs
    ;;
    "remove_ipfs")
      remove_ipfs
    ;;
    "start_ipfs")
      start_ipfs
    ;;
    "stop_ipfs")
      stop_ipfs
    ;;
    "check_ipfs")
      check_ipfs
    ;;
    "install_pool")
      install_pool
    ;; 
    "start_pool")
      start_pool
    ;;
    "stop_pool")
      stop_pool
    ;;
    "check_pool")
      check_pool
    ;;
    "logs")
      tail_logs
    ;;
    "reload")
      stop_sauco
      sleep 2
      start_sauco
      show_blockHeight
      ;;
    "rebuild")
      stop_ipfs
      stop_sauco
      sleep 2
      start_postgres
      sleep 2
      rebuild_sauco
      start_ipfs
      start_sauco
      show_blockHeight
      ;;
    "status")
      if running; then
        echo "√ SAUCO is running."
        show_blockHeight
      else
        echo "X SAUCO is NOT running."
      fi
    ;;
    "start")
      parse_option $@
      start_ipfs
      start_sauco
      show_blockHeight
    ;;
    "snapshot")
      parse_option $@
      start_snapshot
    ;;
    "stop")
      stop_sauco
    ;;

*)
    echo 'Available options: install, reload (stop/start), rebuild (official snapshot), start, stop, update_manager, update_client, update_wallet, install_ipfs, remove_ipfs, start_ipfs, stop_ipfs, check_ipfs'
    echo 'Usage: ./sauco_installer.bash install'
    exit 1
;;
esac
exit 0;
