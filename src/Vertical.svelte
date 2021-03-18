<script>
    import Horizontal from "./Horizontal.svelte";

    // Import "extras"
    import SwiperCore, {
        Navigation,
        Pagination,
        Scrollbar,
        A11y,
    } from "swiper";

    // Import Swiper Svelte components
    import { Swiper, SwiperSlide } from "swiper/svelte";

    // Import Swiper styles
    import "swiper/swiper-bundle.min.css"; // includes all Swiper styles, including all modules styles (like Navigation, Pagination, etc.)

    // install Swiper modules
    SwiperCore.use([Navigation, Pagination, Scrollbar, A11y]);
</script>

<Swiper
    direction="vertical"
    on:slideChange={() => console.log("slide change")}
    on:swiper={(e) => console.log(e.detail[0])}
>
    <SwiperSlide>
        <Horizontal />
    </SwiperSlide>
    <SwiperSlide>
        <Horizontal />
    </SwiperSlide>
    <SwiperSlide>
        <Horizontal />
    </SwiperSlide>
</Swiper>

<style>
    /* .slide {
        height: 90vh;
        color: darkcyan;
    } */
</style>
