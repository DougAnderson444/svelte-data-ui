<script>
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
    spaceBetween={100}
    slidesPerView={1.5}
    navigation
    centerInsufficientSlides
    centeredSlides
    height="100%"
    pagination={{ clickable: true }}
    scrollbar={{ draggable: true }}
    on:slideChange={() => console.log("slide change")}
    on:swiper={(e) => console.log(e.detail[0])}
>
    <SwiperSlide
        ><div class="slide">
            START Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide
            1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1
            Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1
            Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1
            Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1
            Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1
            Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1
            Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1
            Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1
            Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1
            Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1
            Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1
            Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1
            Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1
            Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1
            Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1
            Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1
            Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1 Slide 1
        </div>
    </SwiperSlide>
    <SwiperSlide
        ><div class="slide">
            START Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide
            2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2
            Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2
            Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2
            Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2
            Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2
            Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2
            Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2
            Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2
            Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2
            Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2
            Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2
            Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2
            Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2
            Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2
            Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2
            Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2
            Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2 Slide 2
        </div>
    </SwiperSlide>
    <SwiperSlide
        ><div class="slide">
            START Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide
            3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3
            Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3
            Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3
            Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3
            Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3
            Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3
            Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3
            Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3
            Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3
            Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3
            Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3
            Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3
            Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3
            Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3
            Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3
            Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3 Slide 3
        </div>
    </SwiperSlide>
    <SwiperSlide>Slide 4</SwiperSlide>
    <!-- <span slot="container-start">Container Start</span>
    <span slot="container-end">Container End</span>
    <span slot="wrapper-start">Wrapper Start</span>
    <span slot="wrapper-end">Wrapper End</span> -->
</Swiper>

<style>
    .slide {
        /* width: 60vw; */
        height: 80vh;
        color: darkcyan;
    }
</style>
