#! /usr/bin/env bash

com="$1" ; shift

if   [ "$com" '=' '--web' ] ; then
    exec python -m girder "$@"

elif [ "$com" '=' '--worker' ] ; then
    if [ -n "$CELERY_BROKER" ] ; then
        girder-worker-config set celery broker "$CELERY_BROKER"
    fi

    exec girder-worker "$@"

elif [ "$com" '=' '--provision' ] ; then
    cd /girder
    pip install -e '.[plugins]'

    vars="ghost=$GIRDER_HOST"
    vars="$vars gport=$GIRDER_PORT"
    vars="$vars admin_name=$GIRDER_ADMIN_NAME"
    vars="$vars admin_pass=$GIRDER_ADMIN_PASS"
    vars="$vars gridfsDB=$GIRDER_GRIDFS_DB_NAME"
    vars="$vars gridfsHost=$GIRDER_GRIDFS_DB_HOST"
    vars="$vars user_name=$GIRDER_USER_NAME"
    vars="$vars user_pass=$GIRDER_USER_PASS"
    vars="$vars broker=$GIRDER_BROKER"

    export ANSIBLE_LIBRARY=/etc/ansible/roles/girder.girder/library

    echo "RUNNING PROVISION"
    ansible-playbook -v --extra-vars "$vars" /provision.yml

    plugin_list=""
    plugin_arg="--all-plugins"
    if [ -n "$1" ] ; then
        plugin_list="$1"
        plugin_arg="--plugins"
        shift
    fi

    while [ -n "$1" ] ; do
        plugin_list="${plugin_list},$1"
        shift
    done

    girder-install web "$plugin_arg" "$plugin_list"
    exec echo "PROVISION COMPLETE"
fi
