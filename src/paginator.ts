import { ActionRowData, APIEmbed, Awaitable, BaseInteraction, BaseMessageOptions, BooleanCache, ButtonInteraction, ButtonStyle, CacheType, ComponentType, InteractionCollector, Message, MessageActionRowComponentData, RepliableInteraction, SelectMenuInteraction, User } from "discord.js";
import { action, parseAction, VectoredArray } from "./utils.js";

export type MessageOrInteraction<Cache extends CacheType> = Message<BooleanCache<Cache>> | RepliableInteraction<Cache>;

export interface PaginatorOptions<T, Cache extends CacheType> {
    msg: MessageOrInteraction<Cache>;
    raw: T[];
    user: User;
    embed?: Partial<APIEmbed>;
    components?: ActionRowData<MessageActionRowComponentData>[];
    handler?: InteractionCollector<ButtonInteraction | SelectMenuInteraction>;
}

export class Paginator<T, Cache extends CacheType> extends EventTarget {

    private embed_transformer: (value: T) => Awaitable<APIEmbed>;
    private component_transformer: (value: T) => Awaitable<ActionRowData<MessageActionRowComponentData>[]>;

    private array: VectoredArray<T>;

    private handler: InteractionCollector<ButtonInteraction | SelectMenuInteraction>;

    constructor(
        private options: PaginatorOptions<T, Cache>
    ) {
        super();

        this.array = new VectoredArray(options.raw);

        this.options.embed ??= {};
        this.options.components ??= [];

        this.handler = this.options.handler;

        if (this.options.handler == null)
            if (this.options.msg instanceof Message)
                this.handler = this.options.msg.createMessageComponentCollector({ componentType: ComponentType.Button });
            else
                throw new TypeError("Require handler if msg is an interaction");

        this.handler.on('collect', async i => {
            const [user, action] = parseAction(i.customId);

            if (user?.id != this.options.user.id)
                return;

            if (action == 'previous') {
                await this.previous();
                i.deferUpdate();

                this.dispatchEvent(new Event('previous'));
            }

            if (action == 'next') {
                await this.next();
                i.deferUpdate();

                this.dispatchEvent(new Event('next'));
            }
        });
    }

    public setEmbedTransformer(transformer: (value: T) => Awaitable<APIEmbed>) {
        this.embed_transformer = transformer;

        return this;
    }

    public setComponentTransformer(transformer: (value: T) => Awaitable<ActionRowData<MessageActionRowComponentData>[]>) {
        this.component_transformer = transformer;

        return this;
    }

    private async update(data: string | BaseMessageOptions) {
        if (this.options.msg instanceof Message)
            await this.options.msg.edit(data);

        if (this.options.msg instanceof BaseInteraction)
            this.options.msg = await this.options.msg.followUp(data);
    }

    public async render() {
        const data = await this.embed_transformer?.(this.array.read()) ?? {};
        const components = await this.component_transformer?.(this.array.read()) ?? [];

        await this.update({
            embeds: [{
                ...this.options.embed,
                ...data
            }],
            components: [
                {
                    type: ComponentType.ActionRow,
                    components: [{
                        type: ComponentType.Button,
                        style: ButtonStyle.Secondary,
                        emoji: '⬅',
                        customId: action(this.options.user, 'previous', true),
                        disabled: !this.hasPrevious()
                    }, {
                        type: ComponentType.Button,
                        style: ButtonStyle.Secondary,
                        emoji: '➡',
                        customId: action(this.options.user, 'next', true),
                        disabled: !this.hasNext()
                    }]
                },
                ...this.options.components,
                ...components
            ]
        });
    }

    public getPageCount() {
        return this.array.size();
    }

    public getCurrentPage() {
        return this.array.pos();
    }

    public getCurrentValue() {
        return this.array.read();
    }

    public removePage(page: number) {
        const old = this.array.pos();

        this.array
            .seek(page)
            .remove()
            .seek(old);

        return this;
    }

    public hasNext() {
        return this.array.pos() < this.array.size() - 1
    }

    public hasPrevious() {
        return this.array.pos() > 0;
    }

    public async next() {
        if (!this.hasNext()) return;

        this.array.advance();
        this.render();
    }

    public async previous() {
        if (!this.hasPrevious()) return;

        this.array.advance(-1);
        this.render();
    }

}
