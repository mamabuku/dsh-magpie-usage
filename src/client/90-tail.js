    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const locale = ctx.get('locale');
        if (locale && typeof locale.register === 'function' && typeof locale.bind === 'function') {
          const dispose = locale.register(NS, { zh, en });
          ctx.effect(() => dispose, 'magpie-usage: locale dictionaries');
          const bound = locale.bind(NS);
          if (typeof bound === 'function') t = bound;
        }

        // One settings column: placement, display items, accounts, data source, diagnostics.
        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            {
              name: 'settings.section',
              id: 'magpie-usage',
              order: 35,
              // Never fall back to the raw locale key: the Settings nav shows this
              // string verbatim, and "nav" is unrecognisable.
              label: () => {
                const value = t('nav');
                return typeof value === 'string' && value !== '' && value !== 'nav' ? value : 'Magpie 额度';
              },
              locale: NS,
            },
            SettingsPage,
          ),
        );

        // Three interchangeable surfaces. All are registered; each renders null
        // unless settings.placement selects it, so exactly one is ever visible.
        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register(
            { name: 'conversation.composer.dock', id: 'magpie-usage-dock', order: 20, locale: NS },
            DockSurface,
          ),
        );
        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            { name: 'shell.overlay', id: 'magpie-usage-orb', locale: NS },
            OrbSurface,
          ),
        );
      },
    };
  },
});
