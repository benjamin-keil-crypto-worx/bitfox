module.exports = {
    apps: [{
        name: 'bitfox',
        script: './trade-live.js',
        node_args: '--max-old-space-size=256',
        env: {
            NODE_ENV: 'production'
        },
        watch: false,
        max_memory_restart: '300M',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        error_file: './logs/bitfox-error.log',
        out_file: './logs/bitfox-out.log',
        merge_logs: true,
        autorestart: true,
        restart_delay: 10000,
        max_restarts: 10,
        exp_backoff_restart_delay: 100
    }]
};
